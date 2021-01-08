import {Command, flags} from '@oclif/command'
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Config } from '../types/types'

export default class Deploy extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'

  static flags = {
    help: flags.help({char: 'h'})
  }
  readonly dirPath = '.cintsa';
  readonly configPath = path.join(process.cwd(), `${this.dirPath}/config.json`);

  async run() {
    const {args, flags} = this.parse(Deploy)
    const { domainName } = JSON.parse(fs.readFileSync(this.configPath).toString());
    const staticDirPath = path.join(process.cwd(), '_site');
    exec(`aws s3 sync ${staticDirPath} s3://${domainName}`, (err, stdout, stderr) => {
      this.log(stdout);
    });
  }
}
