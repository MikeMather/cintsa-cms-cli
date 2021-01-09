import {Command, flags} from '@oclif/command'
import * as path from 'path';
import * as fse from 'fs-extra';
import * as nj from 'nunjucks';
import { Schema } from '../types/types';
import * as marked from 'marked';
const fm = require('front-matter')

export default class Deploy extends Command {
  static description = 'Compile the templates into static html'

  static flags = {
    help: flags.help({char: 'h'})
  }
  readonly srcDir = path.join(process.cwd(), 'src');
  readonly destDir = path.join(process.cwd(), '_site');
  schemas: {[key: string]: Schema[]} = {};

  dirExists(path: string): boolean {
    return fse.pathExistsSync(path);
  }

  renderRootLevelFiles(): void {
    const files = fse.readdirSync(`${this.srcDir}`);
    files.forEach((file: string) => {
      const filePath = `${this.srcDir}/${file}`;
      const fileStat = fse.lstatSync(filePath);
      const filename = file.split('.');
      if (fileStat.isFile() && filename.pop() === 'html') {
        const view = {
          global: this.schemas
        };
        const rendered = nj.render(filePath, view);
        if (file === 'index.html') {
          fse.writeFileSync(`${this.destDir}/${file}`, rendered);
        }
        else {
          const subdir = filename.shift();
          const rootFolderPath = `${this.destDir}/${subdir}`
          if (!this.dirExists(rootFolderPath)) {
            fse.mkdirSync(rootFolderPath)
          }
          fse.writeFileSync(`${rootFolderPath}/index.html`, rendered);
        }
      }
    })
  }

  forEachSchemaFile(callback: Function): void {
    const schemaDir = `${this.srcDir}/schemas`;
    const dirs = fse.readdirSync(schemaDir);
    dirs.forEach((dir: string) => {
      // Only loop through schema directory, ignore other files
      const subDir = `${schemaDir}/${dir}`;

      // Loop through the schema directories
      if (this.dirExists(subDir)) {
        const files = fse.readdirSync(subDir);
        // Empty directory first
        if (this.dirExists(`${this.destDir}/${dir}`)) {
          fse.emptyDirSync(`${this.destDir}/${dir}`);
        }

        // For each directory, render all files and add the data to our global state object
        files.forEach((schema) => {
          const post = fse.readFileSync(`${subDir}/${schema}`).toString();
          const content = fm(post);
          const atts = content.attributes as Schema;
          if (!( atts.slug && atts.layout && atts.status)) {
            this.error(`
              Missing front-matter attributes in schema ${schema}.
              The following attributes are mandatory:
              - layout
              - slug
              - status
            `);
          }
          const context = { ...atts, content: marked(content.body)  };
          callback(dir, context, schema)
        });
      }
    })
  }

  getSchemas(): void {
    this.forEachSchemaFile((schemaName: string, context: Schema, filename: string) => {
      const schemas = this.schemas[schemaName] || [];
      this.schemas[schemaName] = [ ...schemas, context]
    })
  }

  renderSchemas(): void {
    this.forEachSchemaFile((schemaName: string, context: Schema, filename: string) => {
      // Copy raw markdown file
      fse.copyFileSync(
        `${this.srcDir}/schemas/${schemaName}/${filename}`, 
        `${this.destDir}/admin/schemas/${schemaName}/${filename}`
      )

      // render markdown file into the HTML schema template
      const view = {
        ...context,
        global: this.schemas
      }
      const rendered = nj.render(`${this.srcDir}/layouts/${context.layout}.html`, view);
      const destDir = `${this.destDir}/${context.slug}`;
      if (!this.dirExists(destDir)) {
        fse.mkdirSync(destDir);
      }
      fse.writeFileSync(`${destDir}/index.html`, rendered);
    });
  }

  async run() {
    const {args, flags} = this.parse(Deploy)
    // Sync files that don't require any rendering
    fse.copySync(`${this.srcDir}/assets`, `${this.destDir}/assets`, {overwrite: true});
    fse.copySync(`${this.srcDir}/layouts`, `${this.destDir}/admin/layouts`, {overwrite: true});
    this.getSchemas();
    this.renderSchemas();
    this.renderRootLevelFiles();
  }
}
