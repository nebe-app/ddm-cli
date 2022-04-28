import chalk from 'chalk';
import path from 'path';
import { readFileSync } from 'fs';

import BaseCommand from '../BaseCommand';

export class Version extends BaseCommand {
	static description = 'Print the version number of the CLI application';

	async run(): Promise<void> {
		const packageJson = JSON.parse(readFileSync(path.join(__dirname, '../../', 'package.json'), 'utf8'));

		console.log(chalk.blue(`${packageJson.name} ${packageJson.version}`));
	}
}
