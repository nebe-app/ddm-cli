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
import accountsUrl from '../utils/accountsUrl';
import { getRoot, setConfig } from '../utils/configGetters';

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

			await axios.post(accountsUrl('public/cli/autologin-request'), {
				client_hash: clientHash,
				secret_hash: secretHash,
				meta: {
					hostname: os.hostname(),
					os: os.type(),
				}
			});

			const path = `/autologin/${clientHash}`;
			let url = `https://accounts.ddco.app${path}`;

			if (local) {
				url = `http://localhost${path}`
			}

			await open(url);
			console.log(chalk.green(`Otevírám prohlížeč s adresou: ${url}`));

			const runner = new Listr([{
				title: 'Čekám na přihlášení...',
				task: async (ctx: ListrContext, task: ListrTaskWrapper) => await new Promise<void>((resolve) => {
					let checks = 0;
					let checkInterval: ReturnType<typeof setInterval>;

					checkInterval = setInterval(async () => {
						if (local) {
							task.title = `Čekám na přihlášení... (${checks + 1}x)`;
						}

						if (checks > 60) { // 2 minutes, check every 2 seconds
							clearInterval(checkInterval);
							throw new Error(`Přihlášení vypršelo, zkuste to znova`);
						}

						checks++;

						const { data } = await axios.post(accountsUrl('public/cli/autologin-check'), {
							client_hash: clientHash,
							secret_hash: secretHash,
						});

						if (data.user) {
							this.setUser(data.user);

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

			const runner = new Listr([{
				title: 'Přihlašuji...',
				task: async (ctx: ListrContext, task: ListrTaskWrapper) => {
					const { data } = await axios.post(
						accountsUrl('public/cli/login'),
						{
							hostname: os.hostname(),
							os: os.type(),
							root: getRoot()
						},
						{
							auth: {
								username: answer1.email,
								password: answer2.password
							}
						}
					);


					if (data.user) {
						this.setUser(data.user);

						task.title = chalk.green(`Uživatel ${data.user.email} přihlášen`);
					} else {
						throw new Error('Přihlášení se nezdařilo');
					}
				}
			}])

			try {
				await runner.run();
			} catch (error: any) {
				Sentry.captureException(error);
				console.error(chalk.red(JSON.stringify(error.response.data)));
			}
		}
	}

	setUser(user: any) {
		setConfig('username', user.git_username);
		setConfig('password', user.git_password);
		setConfig('email', user.email);
		setConfig('user_id', user.id);
		setConfig('name', user.name);
	}
}
