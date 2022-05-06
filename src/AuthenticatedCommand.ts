import chalk from 'chalk';

import BaseCommand from './BaseCommand';
import { getAccessToken } from './utils/configGetters';

export default abstract class AuthenticatedCommand extends BaseCommand {
	async init(): Promise<void> {
		await super.init();

		const accessToken: string | null = getAccessToken();

		if (!accessToken) {
			console.log(chalk.red(`User not logged in, please use the "${this.config.bin} login" command first.`));
			process.exit(1);
		}

		// ToDo: validate token is still valid + try refreshing it
	}
};
