Cintsa CLI
======

The CLI tool for the Cintsa CMS system. You can use this to deploy a static-site hosting stack to AWS that is compatible with [Cintsa CMS](https://github.com/MikeMather/cintsa-cms)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g cintsa
$ cintsa init
$ cintsa create-site
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cintsa init`](#cintsa-init)
* [`cintsa create-site`](#cintsa-create-site)
* [`cintsa create-user`](#cintsa-create-user)
* [`cintsa destroy`](#cintsa-destroy)
* [`cintsa build`](#cintsa-build)
* [`cintsa serve`](#cintsa-serve)
* [`cintsa pull`](#cintsa-pull)
* [`cintsa push`](#cintsa-push)
* [`cintsa help [COMMAND]`](#cintsa-help-command)

## `cintsa init`

Initializes the project with Cintsa config files in the .cintsa/ directory
```
USAGE
  $ cintsa init
```

## `cintsa create-site`

Deploys an AWS CloudFormation stack to create the Cintsa project in the cloud. This requires valid AWS credentials and the .cintsa/config.json to be valid.
```
USAGE
  $ cintsa create-site
```

## `cintsa create-user --email [EMAIL]`

Once your site is deployed, you can create a user to login to the editor using this command.

```
USAGE
  $ cintsa create-user

FLAGS
  --email  the email to use as the login username
```

## `cintsa destroy`

Destroy the site and all the AWS resources.
```
USAGE
  $ cintsa destroy
```
<!-- commandsstop -->

## `cintsa build`

Builds your static site files into the _site directory. The _site directory can now be used to serve your files from S3.

```
USAGE
  $ cintsa build
```
<!-- commandsstop -->

## `cintsa serve`

Builds and serves the files in the _site folder

```
USAGE
  $ cintsa serve

OPTIONS
  --port  the port to serve the site on
```
<!-- commandsstop -->

## `cintsa pull`

Pull files from the S3 bucket into your local /admin directory

```
USAGE
  $ cintsa pull
```
<!-- commandsstop -->

## `cintsa push`

Pushes your _site directory to your S3 bucket. Recommended to run `cintsa build` before pushing to S3.
```
USAGE
  $ cintsa push
```

<!-- commandsstop -->

## `cintsa help [COMMAND]`

Display help for cintsa

```
USAGE
  $ cintsa help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```
