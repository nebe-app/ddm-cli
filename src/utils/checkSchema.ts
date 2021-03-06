import chalk from 'chalk';
import fs from 'fs-extra';
import axios from 'axios';
import * as Sentry from '@sentry/node';

import devstackUrl from './devstackUrl';
import { ValidatorEntry } from '../types/validation';

export default async function checkSchema(schemaPath: string, state: any): Promise<boolean> {
	if (!fs.existsSync(schemaPath)) {
		console.error(chalk.red(`schema.json does not exist!`));
		return false;
	}

	const schemaContents = fs.readJsonSync(schemaPath);

	if (!schemaContents) {
		console.error(chalk.red(`schema.json is not valid JSON`));
		return false;
	}

	try {
		const { data } = await axios.post(devstackUrl('public/bundle-validator/schema'), {
			schema: schemaContents,
		});

		state.schema = data;

		const { isValid, log } = state.schema;

		const errors = log.filter((entry: ValidatorEntry) => entry.level === 'error');
		const warnings = log.filter((entry: ValidatorEntry) => entry.level === 'warning')

		if (warnings.length > 0) {
			console.log(chalk.yellow(`Upozornění při validaci schématu:`));

			warnings.forEach((warning: ValidatorEntry) => {
				console.log(chalk.yellow(warning.message));
			});
		}

		if (errors.length > 0) {
			console.log(chalk.red(`Chyby při validaci schématu:`));

			errors.forEach((error: ValidatorEntry) => {
				console.log(chalk.red(error.message));
			});
		}

		return isValid;
	} catch (error: any) {
		Sentry.captureException(error);
		console.log(chalk.red(`Chyba při validaci schématu`));
		console.error(error);

		return false;
	}
};
