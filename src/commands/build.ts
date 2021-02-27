import {Command, flags} from '@oclif/command'
import * as path from 'path';
import FileBuilder from '../file-builder';
import { Piece } from '../types/types';

export default class Deploy extends Command {
  static description = 'Compile the templates into static html'

  static flags = {
    help: flags.help({char: 'h'})
  }

  readonly srcDir = path.join(process.cwd(), 'templates');

  readonly destDir = path.join(process.cwd(), '_site');

  pieces: {[key: string]: Piece[]} = {};

  async run() {
    const {args, flags} = this.parse(Deploy)
    const builder = new FileBuilder(this.srcDir, this.destDir, false);
    builder.build();
  }
}
