import {Command, flags} from '@oclif/command'
import * as fs from 'fs';
import * as path from 'path';

export default class Init extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'

  static flags = {
    help: flags.help({char: 'h'})
  }

  readonly dirPath = '.cintsa';
  
  readonly templatePath = path.join(__dirname, '../../template');

  readonly destPath = path.join(process.cwd(), `${this.dirPath}`);

  async run() {
    const {args, flags} = this.parse(Init)

    if (fs.existsSync(this.dirPath)) {
      this.log(`Already initiated. Do 'cintsa create-site' to create your AWS resources or do 'cintsa deploy' to deploy your site`);
      this.exit();
    }
    else {
      fs.mkdirSync(this.dirPath);
      fs.copyFileSync(path.join(this.templatePath, 'config.json'), path.join(this.destPath, 'config.json'));
      this.log(`You're ready to create your AWS resources.`)
      this.log('Next, edit the configuration file in .cintsa/config.json:')
      this.log(`
        appName -> A name for your project
        domainName -> the domain name you intend to host your site on (you'll have to configure your DNS settings manually later)
        region -> The AWS region to deploy your site to
      `)
      this.log(`When you're ready, run 'cintsa create-site' to deploy your AWS stack`);
    }
  }
}
