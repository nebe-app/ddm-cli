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
* [`nebe plugins`](#nebe-plugins)
* [`nebe plugins:install PLUGIN...`](#nebe-pluginsinstall-plugin)
* [`nebe plugins:inspect PLUGIN...`](#nebe-pluginsinspect-plugin)
* [`nebe plugins:install PLUGIN...`](#nebe-pluginsinstall-plugin-1)
* [`nebe plugins:link PLUGIN`](#nebe-pluginslink-plugin)
* [`nebe plugins:uninstall PLUGIN...`](#nebe-pluginsuninstall-plugin)
* [`nebe plugins:uninstall PLUGIN...`](#nebe-pluginsuninstall-plugin-1)
* [`nebe plugins:uninstall PLUGIN...`](#nebe-pluginsuninstall-plugin-2)
* [`nebe plugins update`](#nebe-plugins-update)

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

## `nebe plugins`

List installed plugins.

```
USAGE
  $ nebe plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ nebe plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `nebe plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ nebe plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ nebe plugins add

EXAMPLES
  $ nebe plugins:install myplugin 

  $ nebe plugins:install https://github.com/someuser/someplugin

  $ nebe plugins:install someuser/someplugin
```

## `nebe plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ nebe plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ nebe plugins:inspect myplugin
```

## `nebe plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ nebe plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ nebe plugins add

EXAMPLES
  $ nebe plugins:install myplugin 

  $ nebe plugins:install https://github.com/someuser/someplugin

  $ nebe plugins:install someuser/someplugin
```

## `nebe plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ nebe plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ nebe plugins:link myplugin
```

## `nebe plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nebe plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nebe plugins unlink
  $ nebe plugins remove
```

## `nebe plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nebe plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nebe plugins unlink
  $ nebe plugins remove
```

## `nebe plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ nebe plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ nebe plugins unlink
  $ nebe plugins remove
```

## `nebe plugins update`

Update installed plugins.

```
USAGE
  $ nebe plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
