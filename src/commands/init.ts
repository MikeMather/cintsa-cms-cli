import {Command, flags} from '@oclif/command'
import * as fs from 'fs';
import cli from 'cli-ux'
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
    }
    else {
      cli.action.start('Copying configs...')
      fs.mkdirSync(this.dirPath);
      fs.readdirSync(this.templatePath).forEach((file: string) => {
        fs.copyFileSync(path.join(this.templatePath, file), path.join(this.destPath, file));
      });
      cli.action.stop();
      this.log(`You're ready to create your AWS resources.`)
      this.log(`Next, edit the configuration file in .cintsa/config.json:`)
      this.log(`
        profile -> the AWS profile to user. Make sure you have the AWS cli installed and configured
        appName -> A name for your project
        domainName -> the domain name you intend to host your site on (you'll have to configure your DNS settings manually later)
        region -> The AWS region to deploy your site to
        siteGenerator -> the site generator you're using to create your site. E.g. Jekyll, Gatsby etc.
      `)
      this.log(`When you're ready, run 'cintsa create-site' to deploy your AWS stack`);
    }
  }
}
