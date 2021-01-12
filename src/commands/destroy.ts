import {Command, flags} from '@oclif/command'
import * as path from 'path';
import * as fs from 'fs';
import { Config } from '../types/types'
import * as AWS from 'aws-sdk';
import cli from 'cli-ux'

export default class Deploy extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'

  static flags = {
    help: flags.help({char: 'h'})
  }
  readonly dirPath = '.cintsa';
  readonly configPath = path.join(process.cwd(), `${this.dirPath}/config.json`);

  async emptyBucket(bucket: string) {
    const s3 = new AWS.S3();
    try {
      console.log(`Emptying bucket ${bucket}`);
      const { Contents } = await s3.listObjects({ Bucket: bucket }).promise();
      if (Contents && Contents.length) {
        await s3.deleteObjects({
          Bucket: bucket,
          Delete: {
            Objects: Contents.map(({ Key }) => ({ Key })) as any
          }
        }).promise();;
      }
    } catch (err) {
      // Need better error handling here
      if (err.code !== 'NoSuchBucket') {
        this.error(err);
      }
    }
  };

  async run() {
    const {args, flags} = this.parse(Deploy)
    const { domainName, region, appName }: Config = JSON.parse(fs.readFileSync(this.configPath).toString());
    this.log('Are you sure you want to destroy your site?')
    this.log(`This action will remove all hosted content and cannot be undone. We recommend running 'cintsa pull' to sync your hosted content before continuing.\n`);
    const confirm: boolean = await cli.confirm('Continue? (y/n)');
    if (!confirm) {
      this.exit();
    }
    const cfn = new AWS.CloudFormation({
      region: region
    });
    await this.emptyBucket(domainName);
    cfn.deleteStack({ StackName: appName }, (err, data) => {
      if (err) {
        this.error(JSON.stringify(err));
      }
      cli.action.start('Deleting resources...');
      cfn.waitFor('stackDeleteComplete', { StackName: appName }, (err, data) => {
        if (err) {
          this.error(JSON.stringify(err));
        }
        cli.action.stop();
        this.log('Stack delete complete');
      });
    })
  }
}
