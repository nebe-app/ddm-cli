import inquirer from 'inquirer';
import axios from 'axios';
import os from 'os';
import chalk from 'chalk';
import open from 'open';
import Listr, { ListrContext, ListrTaskWrapper } from 'listr';
import * as crypto from 'crypto';
import * as Sentry from '@sentry/node';
import { Flags } from '@oclif/core';

import BaseCommand from '../BaseCommand';
import apiUrl from '../utils/apiUrl';
import { getRoot, setConfig, isSazka } from '../utils/configGetters';

export class Login extends BaseCommand {
	static description = 'Authorize CLI against web application';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
		local: Flags.boolean({ char: 'l', description: 'Local', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Login);
		const { local, debug } = flags;

		const useAutologinPrompt = await inquirer.prompt({
			type: 'list',
			name: 'autologin',
			message: 'Vyberte způsob přihlášení',
			choices: [{ name: 'Prohlížečem', value: 'autologin' }, { name: 'Zadat e-mail a heslo', value: 'legacy' }]
		});

		const loginMethod = useAutologinPrompt.autologin;

		if (loginMethod === 'autologin') {
			console.log(chalk.green(`Přihlášení prohlížečem...`));

			const clientHash = crypto.randomBytes(40).toString('hex');
			const secretHash = crypto.randomBytes(40).toString('hex');

			await axios.post(apiUrl('autologin-request'), {
				client_hash: clientHash,
				secret_hash: secretHash,
				meta: {
					hostname: os.hostname(),
					os: os.type(),
				}
			});

			const path = `/auth/autologin/${clientHash}`;
			let url = isSazka() ? `https://sazka.nebe.app${path}` : `https://client.nebe.app${path}`;

			if (local) {
				url = `http://localhost:8080${path}`
			}

			await open(url);
			console.log(chalk.green(`Otevírám prohlížeč s adresou: ${url}`));

			const runner = new Listr([{
				title: 'Čekám na přihlášení...',
				task: async (ctx: ListrContext, task: ListrTaskWrapper) => await new Promise<void>((resolve) => {
					let checks = 0;

					const checkInterval = setInterval(async () => {
						if (local) {
							console.log(`Check #${checks}`);
						}

						if (checks > 60) { // 2 minutes, check every 2 seconds
							clearInterval(checkInterval);
							throw new Error(`Přihlášení vypršelo, zkuste to znova`);
						}

						checks++;

						const { data } = await axios.post(apiUrl('autologin-check'), {
							client_hash: clientHash,
							secret_hash: secretHash,
						});

						if (data.user) {
							setConfig('username', data.user.git_username);
							setConfig('password', data.user.git_password);
							setConfig('email', data.user.email);
							setConfig('user_id', data.user.id);
							setConfig('name', data.user.name);

							task.title = chalk.green(`Uživatel ${data.user.email} přihlášen`);

							clearInterval(checkInterval);
							resolve();
						}
					}, 2000);
				})
			}], { renderer: debug ? 'verbose' : 'default' });

			try {
				await runner.run();
			} catch (error) {
				// do nothing (this is here to silence ugly errors thrown into the console, listr prints errors in a pretty way)
			}
		} else {
			const answer1 = await inquirer.prompt([
				{
					type: 'email',
					name: 'email',
					message: 'E-mail'
				}
			]);

			setConfig('email', answer1.email);

			const answer2 = await inquirer.prompt([
				{
					type: 'password',
					name: 'password',
					message: 'Heslo'
				}
			]);

			console.log('Přihlašuji...');

			try {
				const response = await axios.post(apiUrl('login'), {
					hostname: os.hostname(),
					os: os.type(),
					root: getRoot()
				}, {
					auth: {
						username: answer1.email,
						password: answer2.password
					}
				});

				setConfig('username', response.data.user.git_username);
				setConfig('password', response.data.user.git_password);
				setConfig('email', response.data.user.email);
				setConfig('user_id', response.data.user.id);
				setConfig('name', response.data.user.name);

				console.log(chalk.green(`Uživatel ${response.data.user.email} přihlášen`));

			} catch (error: any) {
				Sentry.captureException(error);
				console.error(chalk.red(JSON.stringify(error.response.data)));
			}
		}
	}
}
