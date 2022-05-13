```text
______ ______ ___  ___           _____  _      _____ 
|  _  \|  _  \|  \/  |          /  __ \| |    |_   _|
| | | || | | || .  . |  ______  | /  \/| |      | |  
| | | || | | || |\/| | |______| | |    | |      | |  
| |/ / | |/ / | |  | |          | \__/\| |____ _| |_ 
|___/  |___/  \_|  |_/           \____/\_____/ \___/
```

### Development stack for creating DDM visuals

[![npm](https://img.shields.io/npm/v/ddm-cli.svg)](https://www.npmjs.com/package/ddm-cli)

# Installation

<!-- installation -->

```shell
npm install -g ddm-cli
```

or

```shell
yarn global add ddm-cli
```

<!-- installation stop -->

# Getting started

<!-- getting started -->

- Create proper directory structure `$ ddm install`
- Login to your accounts `$ ddm login`
- Sync visuals `$ ddm sync`

<!-- getting started stop -->

# List commands

<!-- list commands -->

```shell
$ ddm help
```

<!-- list commands stop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g ddm-cli
$ ddm COMMAND
running command...
$ ddm (--version)
ddm-cli/2.0.8 darwin-x64 node-v14.17.3
$ ddm --help [COMMAND]
USAGE
  $ ddm COMMAND
...
```
<!-- usagestop -->

<!-- commands -->
* [`ddm autocomplete [SHELL]`](#ddm-autocomplete-shell)
* [`ddm clone REPONAME`](#ddm-clone-reponame)
* [`ddm convert-pdf`](#ddm-convert-pdf)
* [`ddm create`](#ddm-create)
* [`ddm dev`](#ddm-dev)
* [`ddm fetch`](#ddm-fetch)
* [`ddm help [COMMAND]`](#ddm-help-command)
* [`ddm install`](#ddm-install)
* [`ddm login`](#ddm-login)
* [`ddm pull`](#ddm-pull)
* [`ddm push`](#ddm-push)
* [`ddm status`](#ddm-status)
* [`ddm sync`](#ddm-sync)
* [`ddm update [CHANNEL]`](#ddm-update-channel)
* [`ddm validate`](#ddm-validate)

## `ddm autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ ddm autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ ddm autocomplete

  $ ddm autocomplete bash

  $ ddm autocomplete zsh

  $ ddm autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v1.3.0/src/commands/autocomplete/index.ts)_

## `ddm clone REPONAME`

Clone existing visual

```
USAGE
  $ ddm clone [REPONAME] [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Clone existing visual
```

_See code: [dist/commands/clone.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/clone.ts)_

## `ddm convert-pdf`

Convert pdf to jpg

```
USAGE
  $ ddm convert-pdf [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Convert pdf to jpg
```

_See code: [dist/commands/convert-pdf.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/convert-pdf.ts)_

## `ddm create`

Creates new visual

```
USAGE
  $ ddm create [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Creates new visual
```

_See code: [dist/commands/create.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/create.ts)_

## `ddm dev`

Run development server to create visuals

```
USAGE
  $ ddm dev [-d] [-l] [-n] [-a]

FLAGS
  -a, --latest  Start dev with latest edited visual
  -d, --debug   Debug mode
  -l, --local   Against local apis
  -n, --newest  Start dev with newly created visual

DESCRIPTION
  Run development server to create visuals
```

_See code: [dist/commands/dev.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/dev.ts)_

## `ddm fetch`

Fetch all local visuals

```
USAGE
  $ ddm fetch [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Fetch all local visuals
```

_See code: [dist/commands/fetch.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/fetch.ts)_

## `ddm help [COMMAND]`

Display help for ddm.

```
USAGE
  $ ddm help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for ddm.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `ddm install`

Set home directory for visuals and prepare dev environment

```
USAGE
  $ ddm install

DESCRIPTION
  Set home directory for visuals and prepare dev environment
```

_See code: [dist/commands/install.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/install.ts)_

## `ddm login`

Authorize CLI against web application

```
USAGE
  $ ddm login [-d] [-l]

FLAGS
  -d, --debug  Debug mode
  -l, --local  Local

DESCRIPTION
  Authorize CLI against web application
```

_See code: [dist/commands/login.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/login.ts)_

## `ddm pull`

Pull all local visuals

```
USAGE
  $ ddm pull [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Pull all local visuals
```

_See code: [dist/commands/pull.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/pull.ts)_

## `ddm push`

Push all local visuals

```
USAGE
  $ ddm push [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Push all local visuals
```

_See code: [dist/commands/push.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/push.ts)_

## `ddm status`

Git status of all local visuals

```
USAGE
  $ ddm status [-d]

FLAGS
  -d, --debug  Debug mode

DESCRIPTION
  Git status of all local visuals
```

_See code: [dist/commands/status.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/status.ts)_

## `ddm sync`

Download all synced visuals

```
USAGE
  $ ddm sync [-d] [-s]

FLAGS
  -d, --debug    Debug mode
  -s, --shallow  Perform shallow fetch

DESCRIPTION
  Download all synced visuals
```

_See code: [dist/commands/sync.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/sync.ts)_

## `ddm update [CHANNEL]`

update the ddm CLI

```
USAGE
  $ ddm update [CHANNEL] [-a] [-v <value> | -i] [--force]

FLAGS
  -a, --available        Install a specific version.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
  --force                Force a re-download of the requested version.

DESCRIPTION
  update the ddm CLI

EXAMPLES
  Update to the stable channel:

    $ ddm update stable

  Update to a specific version:

    $ ddm update --version 1.0.0

  Interactively select version:

    $ ddm update --interactive

  See available versions:

    $ ddm update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v3.0.0/src/commands/update.ts)_

## `ddm validate`

Validate the config and schema of all local visuals

```
USAGE
  $ ddm validate

DESCRIPTION
  Validate the config and schema of all local visuals
```

_See code: [dist/commands/validate.ts](https://github.com/nebe-app/ddm-cli/blob/v2.0.8/dist/commands/validate.ts)_
<!-- commandsstop -->
