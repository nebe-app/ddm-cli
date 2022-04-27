DDM Cli
=================

<!-- toc -->

* [Usage](#usage)
* [Commands](#commands)

<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g ddm-cli
$ ddm COMMAND
running command...
$ ddm (--version)
ddm-cli/0.0.0 darwin-x64 node-v14.17.3
$ ddm --help [COMMAND]
USAGE
  $ ddm COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

* [`ddm hello PERSON`](#ddm-hello-person)
* [`ddm hello world`](#ddm-hello-world)
* [`ddm help [COMMAND]`](#ddm-help-command)

## `ddm hello PERSON`

Say hello

```
USAGE
  $ ddm hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Whom is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/ddm-app/ddm-cli/blob/v0.0.0/dist/commands/hello/index.ts)_

## `ddm hello world`

Say hello world

```
USAGE
  $ ddm hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_

<!-- commandsstop -->
