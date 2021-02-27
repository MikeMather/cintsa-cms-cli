import * as fse from 'fs-extra';
import * as nj from 'nunjucks';
import { Piece, PieceStatus } from './types/types';
import * as marked from 'marked';

export default class FileBuilder {

  private srcDir: string;
  private destDir: string;
  private pieces: {[key: string]: Piece[]} = {};
  private env: nj.Environment;
  private renderedFiles: string[] = [];

  constructor(srcDir: string, destDir: string, noCache: boolean) {
    this.srcDir = srcDir;
    this.destDir = destDir;
    this.env = new nj.Environment(new nj.FileSystemLoader(srcDir), { noCache });
  }

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
        fse.copyFileSync(filePath, `${this.destDir}/admin/${file}`);
        const view = {
          global: {
            pieces: this.pieces
          }
        };
        const rendered = this.env.render(filePath, view);
        if (file === 'index.njk') {
          fse.writeFileSync(`${this.destDir}/index.html`, rendered);
          this.renderedFiles.push(`${this.destDir}/index.html`);
        }
        else {
          const subdir = filename.shift();
          const rootFolderPath = `${this.destDir}/${subdir}`
          if (!this.dirExists(rootFolderPath)) {
            fse.mkdirSync(rootFolderPath)
          }
          fse.writeFileSync(`${rootFolderPath}/index.html`, rendered);
          this.renderedFiles.push(`${rootFolderPath}/index.html`);
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
        files.forEach(piece => {
          if (!piece.includes('schema.json')) {
            const post = fse.readFileSync(`${subDir}/${piece}`).toString();
            const content = JSON.parse(post);
            callback(dir, content, piece)
          }
        });
      }
    })
  }

  formatPiece(piece: Piece, schema: any): Piece {
    const formattedPiece = { ...piece };
    schema.fields.forEach(field => {
      if (field.type === 'markdown') {
        formattedPiece[field.name] = marked(formattedPiece[field.name]);
      }
    })
    return formattedPiece
  }

  getPieces(): void {
    const schemas: any = {};
    this.forEachPieceFile((pieceName: string, piece: Piece) => {
      if (!schemas.pieceName) {
        const schema = JSON.parse(fse.readFileSync(`${this.srcDir}/pieces/${pieceName}/schema.json`).toString())
        schemas[pieceName] = schema;
      }
      const pieces = this.pieces[pieceName] || [];
      const formattedPiece = this.formatPiece(piece, schemas[pieceName]);
      this.pieces[pieceName] = [ ...pieces, formattedPiece ]
    });
  }

  renderPieces(): void {
    const schemas: any = {};
    this.forEachPieceFile((pieceName: string, piece: Piece, filename: string) => {
      if (!schemas.pieceName) {
        const schema = JSON.parse(fse.readFileSync(`${this.srcDir}/pieces/${pieceName}/schema.json`).toString())
        schemas[pieceName] = schema;
      }
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
        ...this.formatPiece(piece, schemas[pieceName]),
        global: {
          pieces: this.pieces
        }
      }
      // Only render published files
      if (view.status === PieceStatus.PUBLISHED) {
        const rendered = this.env.render(`${this.srcDir}/layouts/${piece.layout}.njk`, view);
        const destDir = `${this.destDir}/${piece.slug}`;
        if (!this.dirExists(destDir)) {
          fse.mkdirSync(destDir);
        }
        fse.writeFileSync(`${destDir}/index.html`, rendered);
        this.renderedFiles.push(`${destDir}/index.html`)
      }
    });
  }

  build() {
    fse.removeSync(this.destDir);
    fse.mkdirSync(this.destDir);
    // Sync files that don't require any rendering
    fse.copySync(`${this.srcDir}/assets`, `${this.destDir}/assets`, {overwrite: true});
    fse.copySync(`${this.srcDir}/layouts`, `${this.destDir}/admin/layouts`, {overwrite: true});
    fse.copySync(`${this.srcDir}/includes`, `${this.destDir}/admin/includes`, {overwrite: true});
    fse.copyFileSync(`${process.cwd()}/.cintsa/aws-exports.json`, `${this.destDir}/assets/js/aws-exports.json`);
    this.getPieces();
    this.renderPieces();
    this.renderRootLevelFiles();
    this.renderedFiles.forEach((file: string) => {
      console.log(`Rendered: _site/${file.split('_site/')[1]}`);
    })
  }
}
