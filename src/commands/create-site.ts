import {Command, flags} from '@oclif/command'

export default class CreateSite extends Command {
  static description = 'Initialize the project for use with Cintsa CMS'

  static flags = {
    help: flags.help({char: 'h'})
  }

  async run() {
    const {args, flags} = this.parse(CreateSite)
  }
}
