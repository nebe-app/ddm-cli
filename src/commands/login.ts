import axios from 'axios';
import chalk from 'chalk';
import open from 'open';
import express from 'express';
import randomstring from 'randomstring';
import path from 'path';
import * as Sentry from '@sentry/node';
import Listr, { ListrContext, ListrTaskWrapper } from 'listr';
import { Flags } from '@oclif/core';

import BaseCommand from '../BaseCommand';
import accountsUrl from '../utils/accountsUrl';
import { setConfig, getAccessToken } from '../utils/configGetters';
import { Token } from '../types/login';

export class Login extends BaseCommand {
	static description = 'Authorize CLI against web application';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
		local: Flags.boolean({ char: 'l', description: 'Local', required: false, default: false }),
	};

	private OAuthClientId: string | null = null;

	private OAuthClientSecret: string | null = null;

	private RedirectURI: string | null = null;

	private ExpressPort: number = 8050;

	async run(): Promise<void> {
		const { flags } = await this.parse(Login);
		const { local, debug } = flags;

		this.OAuthClientId = local ? '963b867a-f8a3-4abf-abc7-9b2cf27376eb' : '963bd29c-5162-4e81-b3c7-e6b22915d68e';
		this.OAuthClientSecret = local ? 'wCeDg2MlEkVURVpVPxxN1cq9R9qhBZcu2lXVK3eY' : 'EDBe481iZWGXk4hnOJUH9FcFqRu7yxzrjDYYj83x';
		this.RedirectURI = 'http://localhost:8050';
		this.ExpressPort = 8050;

		const app = express();
		let token: Token | null = null;

		app.get('/', async (req, res) => {
			const { code } = req.query;

			if (!code) {
				return res.status(400).send('Unable to login');
			}

			try {
				const { data } = await axios.post(accountsUrl('oauth/token', false), {
					grant_type: 'authorization_code',
					code,
					redirect_uri: this.RedirectURI,
					client_id: this.OAuthClientId,
					client_secret: this.OAuthClientSecret,
				});

				token = data;
			} catch (error: any) {
				return res.status(400).send(error.message);
			}

			return res.sendFile(path.join(__dirname, '../static/index.html'));
		});

		const server = await app.listen(this.ExpressPort);

		if (debug) {
			console.log(chalk.green(`Listening on port ${this.ExpressPort}`));
		}

		const state = randomstring.generate({ length: 40 });
		const challenge = {
			client_id: this.OAuthClientId,
			redirect_uri: this.RedirectURI,
			response_type: 'code',
			scope: '',
			state,
		};

		const endpoint: string = `oauth/authorize?${(new URLSearchParams(challenge)).toString()}`;
		const url: string = accountsUrl(endpoint, false);

		await open(url);
		console.log(chalk.green(`Otevírám prohlížeč s adresou: ${url}`));

		const runner = new Listr([
			{
				title: 'Čekám na přihlášení...',
				task: async (ctx: ListrContext, task: ListrTaskWrapper) => await new Promise<void>((resolve, reject) => {
					let checks = 0;

					const checkInterval: ReturnType<typeof setInterval> = setInterval(async () => {
						if (local) {
							task.title = `Čekám na přihlášení... (${checks + 1}x)`;
						}

						if (checks > 60) { // 2 minutes, check every 2 seconds
							clearInterval(checkInterval);
							throw new Error(`Přihlášení vypršelo, zkuste to znova`);
						}

						checks++;

						if (token) {
							this.setToken(token);

							const accessToken = getAccessToken();

							if (!accessToken) {
								clearInterval(checkInterval);
								throw new Error(`Přihlášení se nezdařilo, zkuste to znova`);
							}

							try {
								const { data: user } = await axios.get(accountsUrl('user'), {
									headers: {
										Authorization: accessToken,
									},
								});

								this.setUser(user);

								task.title = chalk.green(`Uživatel ${user.email} přihlášen`);

								clearInterval(checkInterval);
								resolve();
							} catch (error: any) {
								console.log(chalk.red(error.message));

								if (server) {
									await server.close();
								}

								process.exit(1);
							}
						}
					}, 2000);
				})
			}
		], { renderer: debug ? 'verbose' : 'default' });

		try {
			await runner.run();
		} catch (error: any) {
			Sentry.captureException(error);
			console.log(chalk.red(JSON.stringify(error.response.data)));
		}

		if (server) {
			await server.close();
		}

		process.exit(0);
	}

	setToken(token: Token): void {
		setConfig('token', token);
	}

	setUser(user: any) {
		setConfig('username', user.git_username);
		setConfig('password', user.git_password);
		setConfig('email', user.email);
		setConfig('user_id', user.id);
		setConfig('name', user.name);
	}
}
