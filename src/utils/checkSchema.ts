import chalk from 'chalk';
import fs from 'fs-extra';
import axios from 'axios';
import * as Sentry from '@sentry/node';

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
		// ToDo: replace with cloud devstack endpoint
		const response = await axios.post('https://utilities.nebe.app/visual-processor/schema', schemaContents);
		const data = response.data;

		state.schema = data;

		const valid = data.valid;
		const log = data.log;

		if (valid) {
			console.log(chalk.green(`Schema seems ok`));
			return true;
		}

		console.error(chalk.red(`Chyby při validaci schématu:`));

		log.forEach((error: any) => {
			console.error(chalk.red(error.message));
		});

		return false;

	} catch (error: any) {
		Sentry.captureException(error);
		console.error(chalk.red(`Chyba při validaci schématu`));
		console.error(chalk.red(JSON.stringify(error.response.data)));

		return false;
	}
};
