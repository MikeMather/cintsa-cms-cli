import {Command, flags} from '@oclif/command'
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export default class Push extends Command {
  static description = 'Push build folder up to S3 to serve the static files'

  static flags = {
    help: flags.help({char: 'h'})
  }
  
  readonly dirPath = '.cintsa';

  readonly configPath = path.join(process.cwd(), `${this.dirPath}/config.json`);

  async run() {
    const {args, flags} = this.parse(Push)
    const { domainName } = JSON.parse(fs.readFileSync(this.configPath).toString());
    const staticDirPath = path.join(process.cwd(), '_site');
    exec(`aws s3 sync ${staticDirPath} s3://${domainName}`, (err, stdout, stderr) => {
      this.log(stdout);
    });
  }
}
