oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g nebe-cli-next
$ nebe COMMAND
running command...
$ nebe (--version)
nebe-cli-next/0.0.0 darwin-x64 node-v14.17.3
$ nebe --help [COMMAND]
USAGE
  $ nebe COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`nebe hello PERSON`](#nebe-hello-person)
* [`nebe hello world`](#nebe-hello-world)
* [`nebe help [COMMAND]`](#nebe-help-command)

## `nebe hello PERSON`

Say hello

```
USAGE
  $ nebe hello [PERSON] -f <value>

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

_See code: [dist/commands/hello/index.ts](https://github.com/nebe-app/nebe-cli-next/blob/v0.0.0/dist/commands/hello/index.ts)_

## `nebe hello world`

Say hello world

```
USAGE
  $ nebe hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ oex hello world
  hello world! (./src/commands/hello/world.ts)
```

## `nebe help [COMMAND]`

Display help for nebe.

```
USAGE
  $ nebe help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for nebe.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.10/src/commands/help.ts)_
<!-- commandsstop -->
