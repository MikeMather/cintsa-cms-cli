import {Command, flags} from '@oclif/command'
import * as path from 'path';
import * as fse from 'fs-extra';
import * as nj from 'nunjucks';
import { Piece, PieceStatus } from '../types/types';
import * as marked from 'marked';
const fm = require('front-matter')

export default class Deploy extends Command {
  static description = 'Compile the templates into static html'

  static flags = {
    help: flags.help({char: 'h'})
  }
  readonly srcDir = path.join(process.cwd(), 'src');
  readonly destDir = path.join(process.cwd(), '_site');
  pieces: {[key: string]: Piece[]} = {};

  dirExists(path: string): boolean {
    return fse.pathExistsSync(path);
  }

  renderRootLevelFiles(): void {
    const files = fse.readdirSync(`${this.srcDir}`);
    files.forEach((file: string) => {
      const filePath = `${this.srcDir}/${file}`;
      const fileStat = fse.lstatSync(filePath);
      const filename = file.split('.');
      if (fileStat.isFile() && filename.pop() === 'njk') {
        const view = {
          global: this.pieces
        };
        const rendered = nj.render(filePath, view);
        if (file === 'index.njk') {
          this.log(`Rendered ${this.destDir}/index.html`);
          fse.writeFileSync(`${this.destDir}/index.html`, rendered);
        }
        else {
          const subdir = filename.shift();
          const rootFolderPath = `${this.destDir}/${subdir}`
          if (!this.dirExists(rootFolderPath)) {
            fse.mkdirSync(rootFolderPath)
          }
          this.log(`Rendered ${rootFolderPath}/index.html`);
          fse.writeFileSync(`${rootFolderPath}/index.html`, rendered);
        }
      }
    })
  }

  forEachPieceFile(callback: Function): void {
    const piecesDir = `${this.srcDir}/pieces`;
    const dirs = fse.readdirSync(piecesDir);
    dirs.forEach((dir: string) => {
      // Only loop through pieces directory, ignore other files
      const subDir = `${piecesDir}/${dir}`;

      // Loop through the pieces directories
      if (this.dirExists(subDir)) {
        const files = fse.readdirSync(subDir);
        // Empty directory first
        if (this.dirExists(`${this.destDir}/${dir}`)) {
          fse.emptyDirSync(`${this.destDir}/${dir}`);
        }

        // For each directory, render all files and add the data to our global state object
        files.forEach((piece) => {
          const post = fse.readFileSync(`${subDir}/${piece}`).toString();
          const content = fm(post);
          const atts = content.attributes as Piece;
          if (!( atts.slug && atts.layout && atts.status)) {
            this.error(`
              Missing front-matter attributes in piece ${piece}.
              The following attributes are required:
              - layout
              - slug
              - status
            `);
          }
          const context = { ...atts, content: marked(content.body)  };
          callback(dir, context, piece)
        });
      }
    })
  }

  getPieces(): void {
    this.forEachPieceFile((pieceName: string, piece: Piece, filename: string) => {
      const pieces = this.pieces[pieceName] || [];
      this.pieces[pieceName] = [ ...pieces, piece ]
    });
  }

  renderPieces(): void {
    this.forEachPieceFile((pieceName: string, piece: Piece, filename: string) => {

      // Make the pieces directory if it doesn't exist
      if (!this.dirExists(`${this.destDir}/admin/pieces`)) {
        fse.mkdirSync(`${this.destDir}/admin/pieces`);
      }

      // Make a directory for the admin piece if it doesn't exist
      if (!this.dirExists(`${this.destDir}/admin/pieces/${pieceName}`)) {
        fse.mkdirSync(`${this.destDir}/admin/pieces/${pieceName}`);
      }

      // Make a directory for the served piece if it doesn't exist
      if (!this.dirExists(`${this.destDir}/${pieceName}`)) {
        fse.mkdirSync(`${this.destDir}/${pieceName}`);
      }

      // Copy raw markdown file
      fse.copyFileSync(
        `${this.srcDir}/pieces/${pieceName}/${filename}`, 
        `${this.destDir}/admin/pieces/${pieceName}/${filename}`
      )

      // render markdown file into the HTML piece template
      const view = {
        ...piece,
        global: this.pieces
      }
      // Only render published files
      if (view.status === PieceStatus.PUBLISHED) {
        const rendered = nj.render(`${this.srcDir}/layouts/${piece.layout}.njk`, view);
        const destDir = `${this.destDir}/${piece.slug}`;
        if (!this.dirExists(destDir)) {
          fse.mkdirSync(destDir);
        }
        this.log(`Rendered ${destDir}/index.html`)
        fse.writeFileSync(`${destDir}/index.html`, rendered);
      }
    });
  }

  async run() {
    const {args, flags} = this.parse(Deploy)
    // Sync files that don't require any rendering
    fse.copySync(`${this.srcDir}/assets`, `${this.destDir}/assets`, {overwrite: true});
    fse.copySync(`${this.srcDir}/layouts`, `${this.destDir}/admin/layouts`, {overwrite: true});
    fse.copySync(`${this.srcDir}/layouts`, `${this.destDir}/admin/includes`, {overwrite: true});
    fse.copyFileSync(`${process.cwd()}/.cintsa/aws-exports.json`, `${this.destDir}/assets/js/aws-exports.json`);
    this.getPieces();
    this.renderPieces();
    this.renderRootLevelFiles();
  }
}
