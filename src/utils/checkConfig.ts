import chalk from 'chalk';
import fs from 'fs-extra';

export default async function checkConfig(configPath: string): Promise<boolean> {
	let errors = 0;

	if (!fs.existsSync(configPath)) {
		console.error(chalk.red(`config.json does not exist!`));
		return false;
	}

	const configContents = fs.readJsonSync(configPath);

	if (!configContents) {
		console.error(chalk.red(`File config.json is not valid JSON`));
		return false;
	}

	// ToDo: replace next couple of steps with call to cloud devstack endpoint

	if (typeof configContents.format !== 'string') {
		console.error(chalk.red(`Visual's format is not defined`));
		return false;
	} else if (['fallback', 'html', 'print', 'image', 'video', 'audio', 'source'].indexOf(configContents.format) === -1) {
		console.error(chalk.red(`Visual's format is not correct`));
		return false;
	}

	if (typeof configContents.name !== 'string') {
		console.error(chalk.red(`Visual's name is not defined`));
		return false;
	} else if (configContents.name.trim().length === 0) {
		console.error(chalk.red(`Visual's name is empty`));
		return false;
	}

	if (typeof configContents.description !== 'string') {
		console.warn(chalk.yellow(`Visual's description is not defined`));
		errors++;
	} else if (configContents.description.trim().length === 0) {
		console.warn(chalk.red(`Visual's description is empty`));
		errors++;
	}

	if (errors === 0) {
		console.log(chalk.green(`Config seems ok`));
	}

	return true;
};
