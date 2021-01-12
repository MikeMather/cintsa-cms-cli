import {Command, flags} from '@oclif/command'
import * as fs from 'fs';
import cli from 'cli-ux'
import * as path from 'path';
import * as mustache from 'mustache';
import * as crypto from 'crypto';
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
  readonly destTemplatePath = path.join(process.cwd(), `${this.dirPath}/static-site.yaml`);
  readonly templatePath = path.join(__dirname, `../../template/static-site.yaml`);
  readonly destExportsPath = path.join(process.cwd(), `${this.dirPath}/aws-exports.json`);

  validateConfig(config: Config): void {
    const { appName, domainName, region, profile, siteGenerator } = config;
    if (!(appName && domainName && region && profile)) {
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
      auth: awsExports,
      storage: {
        bucket: domainName,
        region
      }
    }
    fs.writeFileSync(this.destExportsPath, JSON.stringify(output, null, 4));
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
    let template: string;
    if (fs.existsSync(this.destTemplatePath)) {
      template = fs.readFileSync(this.destTemplatePath).toString();
    }
    else {
      template = mustache.render(fs.readFileSync(this.templatePath).toString(), config);
      fs.writeFileSync(this.destTemplatePath, template);
    }
  
    const cfn = new AWS.CloudFormation({
      region: config.region
    });
    const params = {
      StackName : config.appName,
      Capabilities: [ 'CAPABILITY_IAM' ],
      TemplateBody: template
    };
    this.log(`Cintsa will now create the AWS resources necessary to host your CMS, including:
      1. An S3 bucket for static site hosting
      2. A Cognito user/identity pool for authorization
      3. A Cloudfront distribution as a CDN
    `);
    const confirm: boolean = await cli.confirm('Continue? (y/n)');
    if (!confirm) {
      this.exit();
    }

    // Create the stack
    cli.action.start('Creating CloudFormation stack. This might take a few minutes');
    cfn.createStack(params, (err, data) => {
      if (err) {
        this.log('An error occurred creating the stack')
        this.error(JSON.stringify(err));
      }
      cfn.waitFor('stackCreateComplete', { StackName: params.StackName }, (err, data) => {
        if (err) {
          this.error(`There was an error creating the stack: ${JSON.stringify(err)}`);
        }
        this.log('Stack create complete');
        cfn.listExports({}, (err, data) => {
          if (err) {
            this.error(err);
          }
          this.generateExportsFile(data.Exports, config);
        });
        cli.action.stop();
        this.log('Note: It might take a few minutes for your CloudFront distribution to register with the S3 bucket.')
      });
    });
  }
}
