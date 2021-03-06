import chalk from 'chalk';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import inquirer from 'inquirer';
import rimraf from 'rimraf';
import * as Sentry from '@sentry/node';
import { Flags } from '@oclif/core';

import AuthenticatedCommand from '../AuthenticatedCommand';
import apiUrl from '../utils/apiUrl';
import getDirectories from '../utils/getDirectories';
import { getRoot, getUsername, getPassword, getConfig, setConfig, isSazka } from '../utils/configGetters';

export class Sync extends AuthenticatedCommand {
	static description = 'Download all synced visuals';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
		shallow: Flags.boolean({ char: 's', description: 'Perform shallow fetch', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Sync);
		const { debug, shallow } = flags;

		const root: string = getRoot();

		try {
			await fs.promises.mkdir(path.join(root, 'src'));
		} catch (error) {
		}

		const username = getUsername();
		const password = getPassword();

		let response;

		try {
			console.log(chalk.green(`Stahuji seznam kreativ k synchronizaci..`));

			response = await axios.get(apiUrl('visual'), {
				auth: { username, password }
			});
			setConfig('lastSyncResponseData', response.data);
		} catch (error: any) {
			Sentry.captureException(error);
			console.log(error);
			console.error(chalk.red(error.message));
			return;
		}

		/**
		 * Update user
		 */
		setConfig('username', response.data.user.git_username);
		setConfig('password', response.data.user.git_password);
		setConfig('email', response.data.user.email);
		setConfig('user_id', response.data.user.id);
		setConfig('name', response.data.user.name);

		const userEmail = getConfig('email');
		const userName = getConfig('name');

		/**
		 * Select brands
		 */
		let selectedBrands;
		//	const isAllBrands = argv.all;
		const isAllBrands = true; // always sync all brands

		if (isAllBrands) {
			selectedBrands = Object.keys(response.data.brands);
		} else {
			const brandAnswers = await inquirer.prompt({
				type: 'checkbox',
				name: 'brands',
				message: 'Select brands to sync',
				choices: Object.keys(response.data.brands).map(name => {
					return {
						name,
						checked: true
					};
				})
			});

			selectedBrands = brandAnswers.brands;
		}

		// @ts-ignore
		const progress = ({ method, stage, progress }) => {
			if (debug) {
				console.log(`git.${method} ${stage} stage ${progress}% complete`);
			}
		}

		const git = simpleGit({ progress });

		fs.writeFileSync(`${root}/.gitignore`, `*.url`);

		try {
			await fs.promises.mkdir(`${root}/src`);
		} catch (error) {
		}

		let totalSyncedCount = 0;
		let totalCount = 0;

		for (let brand in response.data.brands) {
			if (!response.data.brands.hasOwnProperty(brand)) {
				continue;
			}

			if (selectedBrands.indexOf(brand) === -1) {
				continue;
			}

			const brandPath = `${root}/src/${brand}`;

			try {
				const stats = fs.lstatSync(brandPath);

				if (!stats.isDirectory()) {
					throw new Error('Not directory');
				}
			} catch (error) {
				fs.mkdirSync(brandPath);
				console.log(`Creating directory ${brandPath}`);
			}

			const visuals = response.data.brands[brand];
			const reversedVisualKeys = Object.keys(visuals).reverse();

			// Delete archived
			const visualFolders = await getDirectories(brandPath);

			let shouldSyncCount = 0;
			for (let slug in visuals) {
				totalCount++;
				if (visuals[slug].visual_sync_for_logged_user !== null) {
					shouldSyncCount++;
					totalSyncedCount++;
				}
			}

			console.log(chalk.cyan(`Synchronizuji brand: ${brand} (${shouldSyncCount} z ${Object.keys(visuals).length})`));

			for (let i in visualFolders) {
				if (!visualFolders.hasOwnProperty(i)) {
					continue;
				}
				const visualFolder = visualFolders[i];
				if (reversedVisualKeys.indexOf(visualFolder) === -1) {
					//console.log(`Should delete ${brand}/${visualFolder}`);
					//const files = await fs.promises.readdir(path.join(brandPath, visualFolder), { withFileTypes: true });
					//const hasNoFiles = files.length === 0;
					//const hasOnlyGit = files.length === 1 && files[0].name === '.git';
					//const hasGitAndConfig = files.length === 2 && files[0].name === '.git' && files[1].name === 'config.json';
					//if (hasNoFiles || hasOnlyGit || hasGitAndConfig) {
					if (debug) {
						console.log(`DELETING ${visualFolder}`);
					}
					rimraf.sync(path.join(brandPath, visualFolder));
					//}
				}
			}

			// Clone/fetch new
			for (let i in reversedVisualKeys) {
				let visual = reversedVisualKeys[i];
				if (!visuals.hasOwnProperty(visual)) {
					continue;
				}

				if (debug) {
					console.log(chalk.cyan(`Synchronizuji kreativu: ${visual}`));
				}

				const visualData = visuals[visual];

				const repoPath = `${root}/src/${brand}/${visual}`;

				// Until feature is deployed to prod, assume old behaviour
				if (typeof visualData.visual_sync_for_logged_user === 'undefined') {
					visualData.visual_sync_for_logged_user = { id: 0 };
					console.log(`assume true`);
				}

				if (visualData.visual_sync_for_logged_user) {
					//console.log(visualData.visual_sync_for_logged_user);
				} else {
					//console.log(`Visual is not set to be synced ${repoPath}`);

					try {
						const stats = fs.lstatSync(repoPath);
						if (!stats.isDirectory()) {
							throw new Error('Not directory');
						}

						await git.cwd(repoPath);
						try {
							const status = await git.status();

							if (status.files.length) {
								console.log(`Kreativa "${visual}" m?? b??t odsynchronizov??na, ale slo??ka obsahuje zm??ny, p??eskakuji...`);
								continue;
							}

							if (debug) {
								console.log(`Deleting`);
							}
							rimraf.sync(repoPath);
						} catch (error) {
							console.log(error);
						}

					} catch (error) {
						// Does not exist, that is OK
					}

					continue;
				}

				try {
					const stats = fs.lstatSync(repoPath);

					if (!stats.isDirectory()) {
						throw new Error('Not directory');
					}
				} catch (error) {
					fs.mkdirSync(repoPath);
					if (debug) {
						console.log(`Creating repo directory ${repoPath}`);
					}
				}

				const files = fs.readdirSync(repoPath);

				if (files.length > 0) {
					if (debug) {
						console.log(chalk.green('Git is initialized'));
					}

					try {
						await git.cwd(repoPath);
						//await git.init();
						//await git.addRemote('origin', visualData.origin);
						if (debug) {
							console.log(chalk.green('Repository successfully inited'));
						}
					} catch (error) {
						console.error(error);
						Sentry.captureException(error);
					}
				} else if (!fs.existsSync(path.join(repoPath, '.git'))) {
					if (debug) {
						console.log(chalk.green('Git not yet initialized'));
					}

					try {
						if (debug) {
							console.log(`Starting cloning ${visualData.origin}`);
						}

						const options = shallow ? { '--depth': '1' } : undefined;

						await git.clone(visualData.origin, repoPath, options);

						if (debug) {
							console.log(chalk.green('Repository successfully cloned'));
						}
					} catch (error) {
						console.log(`Chyba p??i klonov??n?? repozit????e`);
						console.error(error);
						Sentry.captureException(error);
					}
				}

				try {
					await git.cwd(repoPath);

					/**
					 * Update username + email for repo
					 */
					let localConfigValues = null;
					const config = await git.listConfig();
					try {
						localConfigValues = JSON.parse(JSON.stringify(config.values['.git/config']));
					} catch (error) {
					}

					if (localConfigValues) {
						const localConfigName = localConfigValues['user.name'];
						const localConfigEmail = localConfigValues['user.email'];

						if (!localConfigName && userName) {
							if (debug) {
								console.log(chalk.blue(repoPath + ' setting user.name'));
							}
							await git.addConfig('user.name', userName);
						}
						if (!localConfigEmail && userEmail) {
							if (debug) {
								console.log(chalk.blue(repoPath + ' setting user.email'));
							}
							await git.addConfig('user.email', userEmail);
						}
					}

					try {
						await git.fetch();
					} catch (error: any) {
						console.log(chalk.red(repoPath + ' threw error: ' + error.message));
						continue;
					}

					let status;

					try {
						status = await git.status();
					} catch (error: any) {
						console.log(chalk.red(repoPath + ' threw git status error: ' + error.message));
						continue;
					}

					if (status.files.length) {
						if (debug) {
							console.log(chalk.yellow(repoPath + ' has some changed files, commit them or push them!'));
						}
						continue;
					}

					if (status.behind > 0) {
						if (debug) {
							console.log(chalk.yellow(repoPath + ' is behind, pulling'));
						}
						await git.pull();
					}

					if (status.ahead > 0) {
						console.log(chalk.yellow(repoPath + ' is ahead, push the changes!'));
					}
				} catch (error) {
					Sentry.captureException(error);
					console.error(error);
				}
			}
		}

		console.log(chalk.green(`Celkem lok??ln?? synchronizov??no ${totalSyncedCount} z ${totalCount} kreativ`));

		const url = isSazka() ? 'https://sazka.nebe.app/visual/sync' : 'https://client.nebe.app/visual/sync';
		console.log(chalk.blue(`Nastaven??, kter?? kreativy se maj?? lok??ln?? synchronizovat, naleznete na adrese: ${url}`));

		const now = new Date();
		setConfig('lastSync', now.toISOString());
	}
}
