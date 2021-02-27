import {Command, flags} from '@oclif/command'
import * as fs from 'fs';
import cli from 'cli-ux'
import * as path from 'path';
import * as AWS from 'aws-sdk';
import { Config } from '../types/types'
import { Exports } from 'aws-sdk/clients/cloudformation';

export default class CreateSite extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'

  static flags = {
    help: flags.help({char: 'h'})
  }

  readonly dirPath = '.cintsa';
  readonly configPath = path.join(process.cwd(), `${this.dirPath}/config.json`);
  readonly destTemplatePath = path.join(process.cwd(), `${this.dirPath}/cloud-stack.yaml`);
  readonly templatePath = path.join(__dirname, '../../template/cloud-stack.yaml');
  readonly assetsTemplatePath = path.join(__dirname, '../../template/cintsa-assets.yaml');
  readonly destExportsPath = path.join(process.cwd(), `${this.dirPath}/aws-exports.json`);

  validateConfig(config: Config): void {
    const { appName, domainName, region } = config;
    if (!(appName && domainName && region)) {
      this.error('Config values from config.json missing or invalid');
    }
  }

  /**
   * Take the CloudFormation exported variables and map them into the appropriate format
   * for AWS Amplify
   * @param exports The exported variables from the cloudformation templates
   * @param config The user-specified config file
   */
  generateExportsFile(exports: Exports | undefined, config: Config): void {
    const { region, domainName, appName } = config;
    // The format of the file that Amplify needs to authenticate
    const awsExports: {[key: string]: string} = {
      region,
      identityPoolId: '',
      userPoolId: '',
      userPoolWebClientId: ''
    };

    // Put the app name into the CF variables and map them to the export file variables
    const cfOutput = [ 'CintsaIdentityPoolId', 'CintsaUserPoolClientId', 'CintsaUserPoolId' ];
    const exportKeys = [ 'identityPoolId', 'userPoolWebClientId', 'userPoolId' ]
    const keys: {[key: string]: string } = cfOutput.reduce((obj, key, i) => ({
      ...obj,
      [`${appName}-${key}`]: exportKeys[i] 
    }), {})
    Object.keys(keys).forEach((key: string) => {
      exports?.forEach((exp: any) => {
        if (exp.Name === key) {
          awsExports[keys[key]] = exp.Value;
        }
      });
    });
    const output = {
      Auth: awsExports,
      Storage: {
        bucket: domainName,
        region
      }
    }
    fs.writeFileSync(this.destExportsPath, JSON.stringify(output, null, 4));
  }

  async createArtifactsStack(template: string, config: Config, cfn: AWS.CloudFormation, params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = {
        ...params,
        TemplateBody: template,
        StackName: `${config.appName}-CintsaArtifacts`
      };
      cfn.createStack(options).promise().then(() => {
        cli.action.start('Creating Cintsa artifacts bucket');
        cfn.waitFor('stackCreateComplete', { StackName: options.StackName }).promise()
        .then(data => {
          const file = fs.readFileSync(path.join(__dirname, '../lambda/dynamicBuilder.zip'));
          const s3 = new AWS.S3();
          s3.putObject({
            Bucket: `cintsa-artifacts-${config.domainName}`,
            Body: file,
            Key: 'dynamicBuilder.zip'
          }).promise().then(() => {
            cli.action.stop();
            resolve();
          }).catch(err => {
            this.error(err);
          })
        })
        .catch(err => {
          this.error(`There was an error creating the stack: ${JSON.stringify(err)}`);
        });
      })
    })
  }

  async createAppStack(template: string, config: Config, cfn: AWS.CloudFormation, params: any): Promise<void> {
    cli.action.start('Creating site cloud stack. This could take a few minutes');
    return new Promise((resolve, reject) => {
      const options = {
        ...params,
        TemplateBody: template,
        StackName: config.appName
      };
      cfn.createStack(options).promise()
      .then(data => {
        cfn.waitFor('stackCreateComplete', { StackName: options.StackName }).promise()
        .then(data => {
          this.log('Stack create complete');
          cfn.listExports({}).promise()
          .then(exports => {
            this.generateExportsFile(exports.Exports, config);
            cli.action.stop();
            resolve();
          })
          .catch(err => {
            this.error(err);
          });
        })
        .catch(err => {
          this.error(`There was an error creating the stack: ${JSON.stringify(err)}`);
        });
      })
      .catch(err => {
        this.log('An error occurred creating the stack')
        this.error(JSON.stringify(err));
      });
    });
  }

  /**
   * Copy the stack to the process folder and render it with the config variables.
   * Then create the stack in AWS and write the exported variables to a file.
   */
  async run() {
    const {args, flags} = this.parse(CreateSite)
    const config: Config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    this.validateConfig(config);

    // Render the template using the config variables
    const template: string = fs.readFileSync(this.templatePath).toString()
    const assetsTemplate: string = fs.readFileSync(this.assetsTemplatePath).toString()

    const cfn = new AWS.CloudFormation({
      region: config.region
    });
    const params = {
      StackName: config.appName,
      Capabilities: [ 'CAPABILITY_IAM' ],
      TemplateBody: template,
      Parameters: [
        {
          ParameterKey: 'DomainName',
          ParameterValue: config.domainName
        },
        {
          ParameterKey: 'AppName',
          ParameterValue: config.appName
        }
      ]
    };
    this.log(`Cintsa will now create the AWS resources necessary to host your CMS, including:
      1. An S3 bucket for static site hosting
      2. A Lambda function for real-time site building
      2. A Cognito user/identity pool for authorization
      3. A Cloudfront distribution as a CDN
    `);
    const confirm: boolean = await cli.confirm('Continue? (y/n)');
    if (!confirm) {
      this.exit();
    }
    await this.createArtifactsStack(assetsTemplate, config, cfn, params);
    await this.createAppStack(template, config, cfn, params);
  }
}
