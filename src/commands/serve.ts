import {Command, flags} from '@oclif/command'
import * as path from 'path';
import FileBuilder from '../file-builder';
import * as express from 'express';
import * as fse from 'fs-extra';

export default class Serve extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'


  static flags = {
    help: flags.help({char: 'h'}),
    port: flags.string({char: 'p', required: false})
  }

  readonly srcDir = path.join(process.cwd(), 'templates');
  readonly destDir = path.join(process.cwd(), '_site');
  port = '3000';
  builder = new FileBuilder(this.srcDir, this.destDir, true);
  app: express;
  server = express();

  rebuild(): void {
    console.log('Rebuilding...');
    this.builder.build()
    this.server.use('/', express.static(this.destDir));
    this.app = this.server.listen(this.port);
    console.log(`Listening at localhost:${this.port}`);
  }

  async run() {
    const {args, flags} = this.parse(Serve)
    this.port = flags.port || '3000';
    this.rebuild();
    fse.watch(this.srcDir, (event, filename) => {
      this.app.close();
      this.rebuild();
    });
  }
}
