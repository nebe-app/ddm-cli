import axios from 'axios';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import chalk from 'chalk';
import open from 'open';
import inquirer from 'inquirer';
import notifier from 'node-notifier';
import Listr from 'listr';
import chokidar from 'chokidar';
import * as Sentry from '@sentry/node';
import { Flags } from '@oclif/core';

import AuthenticatedCommand from '../AuthenticatedCommand';
import selectVisual from '../utils/selectVisual';
import { getRoot, getLastDev, getConfig, setConfig, getAccessToken } from '../utils/configGetters';
import { Endpoint, Endpoints } from '../types/dev';
import devstackUrl from '../utils/devstackUrl';
import studioUrl from '../utils/studioUrl';

export class Dev extends AuthenticatedCommand {
	static description = 'Run development server to create visuals';

	static flags = {
		debug: Flags.boolean({
			char: 'd',
			description: 'Debug mode',
			required: false,
			default: false
		}),
		newest: Flags.boolean({
			char: 'n',
			description: 'Start dev with newly created visual',
			required: false,
			default: false
		}),
		latest: Flags.boolean({
			char: 'a',
			description: 'Start dev with latest edited visual',
			required: false,
			default: false
		}),
		local: Flags.boolean({
			char: 'l',
			description: 'Start dev against local api',
			hidden: true,
			required: false,
			default: false
		}),
	};

	private endpoints: Endpoints = {
		list: { url: `/filesystem/{bundleId}?path={path}`, method: 'get' },
		show: { url: `/filesystem/{bundleId}/show?path={path}`, method: 'get' },
		store: { url: `/filesystem/{bundleId}/store?path={path}`, method: 'post' },
		upload: { url: `/filesystem/upload`, method: 'post' },
		mkdir: { url: `/filesystem/{bundleId}/mkdir?path={value}`, method: 'post' },
		mkresize: { url: `/filesystem/{bundleId}/mkresize`, method: 'post' },
		mkfile: { url: `/filesystem/{bundleId}/mkfile?path={value}`, method: 'post' },
		rename: { url: `/filesystem/{bundleId}/rename?name={value}`, method: 'post' },
		move: { url: `/filesystem/{bundleId}/move?destPath={value}`, method: 'post' },
		rollback: { url: `/git/{bundleId}/rollback?path={value}`, method: 'post' },
		copy: { url: `/filesystem/{bundleId}/copy?srcPath={srcPath}&destPath={destPath}`, method: 'post' },
		delete: { url: `/filesystem/{bundleId}`, method: 'delete' }
	};

	private watchedEvents: string[] = [
		'add',
		'addDir',
		'unlink',
		'unlinkDir',
		'change',
	];

	private chokidarOptions: any = {
		// ignore dotfiles
		ignored: /(^|[/\\])\../,
		// keep on running after initial "ready" event
		persistent: true,
		// don't fire add/addDir on init
		ignoreInitial: true,
	};

	private timeoutTime: number = 100;

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);
		const { debug, newest, latest, local } = flags;

		// Prepare folder

		const root = getRoot();

		let visualPath: string | null = null;

		if (newest && getConfig('newestVisual')) {
			visualPath = getConfig('newestVisual');
		} else if (latest) {
			visualPath = await this.getLastVisual();
		} else {
			visualPath = await this.detectLastVisual();
		}

		if (!visualPath) {
			visualPath = await selectVisual();
		}

		console.log(`Building ${visualPath}`);
		setConfig('lastDev', visualPath);

		/**
		 * VisualSizes
		 */
		const folders = glob.sync(`${root}/src/${visualPath}/[!_][0-9]*/index.html`);

		if (folders.length === 0) {
			console.error('🛑 Kreativa neobsahuje žádné rozměry! Začněte zkopírováním existující kreativy, pokud existují, nebo si stáhněte šablonu z https://github.com/nebe-app');
			notifier.notify({
				title: 'Nelze spustit devstack',
				message: `🛑 Kreativa neobsahuje žádné rozměry! Začněte zkopírováním existující kreativy nebo si stáhněte šablonu`,
				sound: true,
				icon: path.join(__dirname, '../assets/logo.png')
			});
			process.exit();
		}

		// Select resizes
		// ToDo: allow running multiple bundlers
		const folderChoices = {
			type: 'list',
			name: 'selectedFolder',
			message: 'Select resize',
			choices: folders.map((folder: string) => {
				return folder.toString()
					.replace(`${root}/src/${visualPath}/`, '')
					.replace('/index.html', '');
			})
		};

		const folderAnswers = await inquirer.prompt([folderChoices]);
		const { selectedFolder } = folderAnswers;
		const [orgName, repoName] = visualPath.split('/');

		const repository = await this.getRepository(orgName, repoName);
		const branches = await this.getBranches(orgName, repository.name);
		// output category is on the 3rd position in repo name
		const outputCategory = repository.name.split('-')[2];

		let branch: string | null = null;

		if (branches.length < 1) {
			console.log(chalk.red('🤖 No branches found'));
			process.exit(1);
		}

		if (branches.length === 1) {
			branch = branches[0];
		}

		if (!branch) {
			const branchChoices = {
				type: 'list',
				name: 'selectedBranch',
				message: 'Select branch',
				choices: branches,
			};

			const branchAnswer = await inquirer.prompt([branchChoices]);

			branch = branchAnswer.selectedBranch;
		}

		if (!branch) {
			console.log(chalk.red('🤖 No branches selected'));
			process.exit(1);
		}

		const bundle = await this.startBundle(branch, orgName, repository.name, outputCategory);

		// replace bundleId in endpoints with actual bundle.id
		Object.keys(this.endpoints).forEach((endpoint: string) => {
			const endpointConfig: Endpoint = this.endpoints[endpoint];
			endpointConfig.url = endpointConfig.url.replace('{bundleId}', bundle.id);
		});

		// run preview
		let resize: any = null;

		const runner = new Listr([{
			title: `Running bundler for resize ${selectedFolder}`,
			task: async (ctx, task) => {
				resize = await this.previewResize(orgName, bundle.id, selectedFolder);

				if (!resize) {
					throw new Error('Bundling resize unavailable');
				}

				const url = studioUrl(`visuals/local/${bundle.id}/${selectedFolder}`);

				await open(url);

				task.title = chalk.blue(`🌍 Otevírám prohlížeč s adresou: ${url}`);
			}
		}], {});

		try {
			await runner.run();
		} catch (error: any) {
			Sentry.captureException(error);
			console.log(chalk.red(error.message));
		}

		const watcher = await this.startWatcher(`${root}/src/${visualPath}`);

		console.log('🤖 Watching for changes... Press ctrl + c to stop bundler');

	}

	async getLastVisual() {
		const root = getRoot();
		const lastDev = getLastDev();

		if (!lastDev) {
			return null;
		}

		let visualExists = false;

		try {
			const stats = await fs.promises.lstat(path.join(root, 'src', lastDev));
			visualExists = stats.isDirectory();
		} catch (error) {
		}

		if (!visualExists) {
			return null;
		}

		return lastDev;
	}

	async detectLastVisual() {
		const root = getRoot();
		const lastDev = getLastDev();

		if (!lastDev) {
			return null;
		}

		let visualExists = false;

		try {
			const stats = await fs.promises.lstat(path.join(root, 'src', lastDev));
			visualExists = stats.isDirectory();
		} catch (error) {
		}

		const lastVisualContent = lastDev;

		if (!visualExists) {
			return null;
		}

		const lastVisualAnswers = await inquirer.prompt({
			type: 'list',
			name: 'first',
			message: `Use last visual? ${lastVisualContent}`,
			choices: [
				'Ano',
				'Ne'
			]
		});

		return lastVisualAnswers.first === 'Ano' ? lastVisualContent : null;
	}

	async getRepository(orgName: string, repoName: string): Promise<any> {
		try {
			const url: string = devstackUrl(`gitea/repos/${repoName}`);
			const accessToken: string | null = getAccessToken();

			if (!accessToken) {
				return null;
			}

			const { data } = await axios.get(url, {
				headers: {
					Authorization: accessToken,
					'X-Organization': orgName,
				}
			});

			return data.repo;
		} catch (error: any) {
			console.log(chalk.red(error.message));

			return null;
		}
	}

	async getBranches(orgName: string, repoName: string): Promise<any> {
		try {
			const url: string = devstackUrl(`gitea/branches`);
			const accessToken: string | null = getAccessToken();

			if (!accessToken) {
				return null;
			}

			const { data } = await axios.get(url, {
				params: {
					gitRepoName: repoName,
				},
				headers: {
					Authorization: accessToken,
					'X-Organization': orgName,
				}
			});

			return data.branches;
		} catch (error: any) {
			console.log(chalk.red(error.message));

			return null;
		}
	}

	async startBundle(branch: string, orgName: string, repoName: string, outputCategory: string): Promise<any> {
		try {
			const accessToken: string | null = getAccessToken();

			if (!accessToken) {
				return null;
			}

			const query = {
				branch: branch,
				gitOrgName: orgName,
				gitRepoName: repoName,
				outputCategory: outputCategory,
			};

			const { data } = await axios.post(devstackUrl(`bundles`), query, {
				headers: {
					Authorization: accessToken,
					'X-Organization': orgName,
				}
			});

			return data;
		} catch (error: any) {
			console.error(chalk.red(error.message));

			return null;
		}
	}

	async previewResize(orgName: string, bundleId: number, label: string): Promise<any> {
		try {
			const accessToken: string | null = getAccessToken();

			if (!accessToken) {
				return null;
			}

			const query = {
				bundleId,
				label,
			};

			const { data } = await axios.post(devstackUrl(`resizes`), query, {
				headers: {
					Authorization: accessToken,
					'X-Organization': orgName,
				}
			});

			return data;
		} catch (error: any) {
			console.error(chalk.red(error.message));

			return null;
		}
	}

	async startWatcher(visualPath: string): Promise<any> {
		let watcher: any = {
			handler: null,
			timeout: null,
		};

		// init file watcher
		watcher.handler = chokidar.watch(`${visualPath}`, this.chokidarOptions);

		this.watchedEvents.forEach((event: string) => {
			watcher.handler.on(event, async (filepath: string) => {
				if (watcher.timeout) {
					return;
				}

				// delay watcher, so we don’t capture superfluous file change events within a given window of time
				watcher.timeout = setTimeout(() => {
					clearTimeout(watcher.timeout);
					watcher.timeout = null;
				}, this.timeoutTime);

				console.log(filepath);
			});
		});

		return watcher;
	}
}
