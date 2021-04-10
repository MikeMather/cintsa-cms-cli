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
$ npm install -g cintsa-cms-cli
$ cintsa COMMAND
running command...
$ cintsa (-v|--version|version)
cintsa-cms-cli/0.1.1 darwin-x64 node-v12.13.1
$ cintsa --help [COMMAND]
USAGE
  $ cintsa COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`cintsa build`](#cintsa-build)
* [`cintsa create-site`](#cintsa-create-site)
* [`cintsa create-user`](#cintsa-create-user)
* [`cintsa destroy`](#cintsa-destroy)
* [`cintsa help [COMMAND]`](#cintsa-help-command)
* [`cintsa init`](#cintsa-init)
* [`cintsa pull`](#cintsa-pull)
* [`cintsa push`](#cintsa-push)
* [`cintsa serve`](#cintsa-serve)

## `cintsa build`

Compile the templates into static html

```
USAGE
  $ cintsa build

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/build.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/build.ts)_

## `cintsa create-site`

Initialize the project for use with Cintsa CMS

```
USAGE
  $ cintsa create-site

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/create-site.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/create-site.ts)_

## `cintsa create-user`

Create a user in your Cognito user pool

```
USAGE
  $ cintsa create-user

OPTIONS
  -e, --email=email  (required)
  -h, --help         show CLI help
```

_See code: [src/commands/create-user.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/create-user.ts)_

## `cintsa destroy`

Initialize the project for use with Cintsa CMS

```
USAGE
  $ cintsa destroy

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/destroy.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/destroy.ts)_

## `cintsa help [COMMAND]`

display help for cintsa

```
USAGE
  $ cintsa help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.1/src/commands/help.ts)_

## `cintsa init`

Initialize the project for use with Cintsa CMS

```
USAGE
  $ cintsa init

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/init.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/init.ts)_

## `cintsa pull`

Pull the CMS files from the S3 bucket into the src directory

```
USAGE
  $ cintsa pull

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/pull.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/pull.ts)_

## `cintsa push`

Push build folder up to S3 to serve the static files

```
USAGE
  $ cintsa push

OPTIONS
  -h, --help  show CLI help
```

_See code: [src/commands/push.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/push.ts)_

## `cintsa serve`

Initialize the project for use with Cintsa CMS

```
USAGE
  $ cintsa serve

OPTIONS
  -h, --help       show CLI help
  -p, --port=port
```

_See code: [src/commands/serve.ts](https://github.com/MikeMather/https://github.com/MikeMather/cintsa-cms-cli/blob/v0.1.1/src/commands/serve.ts)_
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
