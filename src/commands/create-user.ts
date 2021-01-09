import {Command, flags} from '@oclif/command'
import * as path from 'path';
import * as fs from 'fs';
import * as AWS from 'aws-sdk';
import * as crypto from 'crypto';
import { generate } from 'generate-password';

export default class CreateUser extends Command {
  static description = 'Create a user in your Cognito user pool'

  static flags = {
    help: flags.help({char: 'h'}),
    email: flags.string({char: 'e'})
  }
  readonly dirPath = '.cintsa';
  readonly awsExportsPath = path.join(process.cwd(), `${this.dirPath}/aws-exports.json`);

  generateTempPassword(): string {
    return generate({
        length: 8,
        numbers: true,
        uppercase: true
    });
  }

  async run() {
    const {args, flags} = this.parse(CreateUser)
    // Check the exports file exists
    if (!fs.existsSync(this.awsExportsPath)) {
        this.error(`
            You haven't configured your static site hosting.
            Run 'cintsa create-site' to setup your AWS resources.
        `)
    }
    
    const resources = JSON.parse(fs.readFileSync(this.awsExportsPath).toString());
    const tmpPassword = this.generateTempPassword();
    console.log(tmpPassword);
    const cognito = new AWS.CognitoIdentityServiceProvider({
        region: resources.aws_cognito_region
    });
    const params = {
        UserPoolId: resources.aws_user_pools_id,
        Username: flags.email,
        DesiredDeliveryMediums: [
            'EMAIL'
        ],
        ForceAliasCreation: false,
        MessageAction: 'SUPPRESS',
        TemporaryPassword: tmpPassword,
        UserAttributes: [
            {
                Name: 'email',
                Value: flags.email
            }
        ]
    };
    cognito.adminCreateUser(params as any, (err, data) => {
        if (err) {
            this.error(JSON.stringify(err));
        }
        this.log(`
            User created successfully. Once you deploy your site, navigate to /admin and login with these credentials:
                username: ${flags.email}
                password: ${tmpPassword}
            You'll be asked to reset your password on your first login.
        `)
    })
  }
}
