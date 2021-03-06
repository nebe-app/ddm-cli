import chalk from 'chalk';
import fs from 'fs-extra';
import axios from 'axios';
import * as Sentry from '@sentry/node';

import devstackUrl from './devstackUrl';
import { ValidatorEntry } from '../types/validation';

export default async function checkConfig(configPath: string, outputCategory: string | null = null): Promise<boolean> {
	if (!fs.existsSync(configPath)) {
		console.error(chalk.red(`config.json does not exist!`));
		return false;
	}

	const configContents = fs.readJsonSync(configPath);

	if (!configContents) {
		console.error(chalk.red(`File config.json is not valid JSON`));
		return false;
	}

	try {
		const { data } = await axios.post(devstackUrl('public/bundle-validator/config'), {
			config: configContents,
			outputCategory,
		});

		const { isValid, log } = data;

		const errors = log.filter((entry: ValidatorEntry) => entry.level === 'error');
		const warnings = log.filter((entry: ValidatorEntry) => entry.level === 'warning')

		if (warnings.length > 0) {
			console.log(chalk.yellow(`Upozornění při validaci configu:`));

			warnings.forEach((warning: ValidatorEntry) => {
				console.log(chalk.yellow(warning.message));
			});
		}

		if (errors.length > 0) {
			console.log(chalk.red(`Chyby při validaci configu:`));

			errors.forEach((error: ValidatorEntry) => {
				console.log(chalk.red(error.message));
			});
		}

		return isValid;

	} catch (error: any) {
		Sentry.captureException(error);
		console.log(chalk.red(`Chyba při validaci configu`));
		console.log(chalk.red(JSON.stringify(error)));

		return false;
	}
};
