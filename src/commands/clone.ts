import chalk from 'chalk';
import fs from 'fs';
import git from 'simple-git';
import { getRoot, getUsername, getPassword } from '../utils/configGetters';

import BaseCommand from '../BaseCommand';

export class Clone extends BaseCommand {
	static args = [
		{ name: 'repoName', required: true },
	];

	static description = 'Clone a repository';

	// hide the command from help
	static hidden = true

	async run(): Promise<void> {
		const { args } = await this.parse(Clone);
		const { repoName } = args;

		if (repoName.indexOf('/') === -1) {
			console.error(chalk.red('Invalid repo name'));
			return;
		}

		const root = getRoot();
		const username = getUsername();
		const password = getPassword();

		const remote = `https://${username}:${password}@git.nebe.app/${repoName}.git`;

		try {
			await fs.promises.mkdir(`${root}/src`);
		} catch (error) {
		}

		try {
			let stats = await fs.promises.lstat(`${root}/src/${repoName}`);
			let exists = /*(stats.isDirectory() && ) || */stats.isFile();

			if (exists) {
				console.error(chalk.red('Repository already cloned'));
				return;
			}
		} catch (error) {
		}

		const brandFolder = repoName.split('/')[0];

		try {
			await fs.promises.mkdir(`${root}/src/${brandFolder}`);
			await fs.promises.mkdir(`${root}/src/${repoName}`);
		} catch (error) {
		}

		try {
			console.log(chalk.blue('Starting cloning...'));
			await git().clone(remote, `${root}/src/${repoName}`, { '--depth': '1' });
			console.log(chalk.green('Repository successfully cloned'));
		} catch (error) {
			console.error(error);
		}
	}
}
