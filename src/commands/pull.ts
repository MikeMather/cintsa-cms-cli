import {Command, flags} from '@oclif/command'
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Config } from '../types/types'

export default class Push extends Command {
  static description = 'Pull the CMS files from the S3 bucket into the src directory'

  static flags = {
    help: flags.help({char: 'h'})
  }
  readonly dirPath = '.cintsa';
  readonly configPath = path.join(process.cwd(), `${this.dirPath}/config.json`);

  async run() {
    const {args, flags} = this.parse(Push)
    const { domainName } = JSON.parse(fs.readFileSync(this.configPath).toString());
    const syncPath = path.join(process.cwd(), 'src');
    exec(`aws s3 sync s3://${domainName}/admin ${syncPath}`, (err, stdout, stderr) => {
      this.log(stdout);
    });
  }
}
