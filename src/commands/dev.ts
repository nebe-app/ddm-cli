import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import chalk from 'chalk';
import open from 'open';
import inquirer from 'inquirer';
import notifier from 'node-notifier';
import FormData from 'form-data';
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
		delete: { url: `/filesystem/{bundleId}?path={value}`, method: 'delete' }
	};

	private chokidarOptions: any = {
		// ignore dotfiles
		ignored: /(^|[/\\])\../,
		// keep on running after initial "ready" event
		persistent: true,
		// don't fire add/addDir on init
		ignoreInitial: true,
		// don't fire add/addDir unless file write is finished
		awaitWriteFinish: {
			// after last write, wait for 1s to compare outcome with source to ensure add/change are properly fired
			stabilityThreshold: 1000,
		},
	};

	private visualRoot: string | null = null;

	private isDebugging: boolean = false;

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);
		const { debug, newest, latest } = flags;

		this.isDebugging = debug;

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

		this.visualRoot = `${root}/src/${visualPath}`;

		// Select resizes
		// ToDo: allow running multiple bundlers
		const folderChoices = {
			type: 'list',
			name: 'selectedFolder',
			message: 'Select resize',
			choices: folders.map((folder: string) => {
				return folder.toString()
					.replace(`${this.visualRoot}/`, '')
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

		// ToDo: check whether bundler is running before prompting branch select
		let branch: string | null = null;

		if (branches.length < 1) {
			console.log(chalk.red('🤖 No branches found'));
			process.exit(1);
		}

		if (branches.length === 1) {
			branch = branches[0].value;
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
			endpointConfig.url = devstackUrl(endpointConfig.url.replace('{bundleId}', bundle.id));
		});

		// run preview
		let resize: any = null;

		const tasks = new Listr([{
			title: `Running bundler for resize ${selectedFolder}`,
			task: async (ctx, task) => {
				resize = await this.previewResize(orgName, bundle.id, selectedFolder);

				if (!resize) {
					throw new Error('Bundling resize unavailable');
				}

				const url = studioUrl(`visuals/local/${bundle.id}/${selectedFolder}`);

				await open(url);

				task.title = chalk.green(`🌍 Otevírám prohlížeč s náhledem kreativy: ${url}`);
			}
		}], {});

		await this.runTasks(tasks);

		const watcher = await this.startWatcher(bundle);

		console.log(chalk.blue('🤖 Watching for changes... Press ctrl + c to stop bundler'));

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
			const config = {
				url: devstackUrl(`gitea/repos/${repoName}`),
				method: 'get',
				headers: {
					'X-Organization': orgName,
				},
			}

			const { data } = await this.performRequest(config);

			return data.repo;
		} catch (error: any) {
			Sentry.captureException(error);

			if (error.response && error.response.data) {
				console.error(error.response.data);
			} else {
				console.error(error);
			}

			return null;
		}
	}

	async getBranches(orgName: string, repoName: string): Promise<any> {
		try {
			const config = {
				url: devstackUrl(`gitea/branches`),
				method: 'get',
				params: {
					gitRepoName: repoName,
				},
				headers: {
					'X-Organization': orgName,
				}
			};

			const { data } = await this.performRequest(config);

			return data.branches;
		} catch (error: any) {
			Sentry.captureException(error);

			if (error.response && error.response.data) {
				console.error(error.response.data);
			} else {
				console.error(error);
			}

			return null;
		}
	}

	async startBundle(branch: string, orgName: string, repoName: string, outputCategory: string): Promise<any> {
		try {
			const config = {
				url: devstackUrl(`bundles`),
				method: 'post',
				data: {
					branch: branch,
					gitOrgName: orgName,
					gitRepoName: repoName,
					outputCategory: outputCategory,
				},
				headers: {
					'X-Organization': orgName,
				},
			};

			const { data } = await this.performRequest(config);

			return data;
		} catch (error: any) {
			Sentry.captureException(error);

			if (error.response && error.response.data) {
				console.error(error.response.data);
			} else {
				console.error(error);
			}

			return null;
		}
	}

	async previewResize(orgName: string, bundleId: number, label: string): Promise<any> {
		try {
			const config = {
				url: devstackUrl(`resizes`),
				method: 'post',
				data: {
					bundleId,
					label,
				},
				headers: {
					'X-Organization': orgName,
				}
			}

			const { data } = await this.performRequest(config);

			return data;
		} catch (error: any) {
			Sentry.captureException(error);

			if (error.response && error.response.data) {
				console.error(error.response.data);
			} else {
				console.error(error);
			}
			return null;
		}
	}

	async startWatcher(bundle: any): Promise<any> {
		if (!this.visualRoot) {
			console.log(chalk.red('🛑 Visual root not set! Cannot start watcher.'));
			process.exit(1);
		}

		// init file watcher
		const watcher = chokidar.watch(`${this.visualRoot}`, this.chokidarOptions);

		// bind event listeners + set context of functions to current class
		watcher.on('add', (filepath: string) => this.onAdd(filepath, bundle));
		watcher.on('unlink', this.onUnlink.bind(this));
		watcher.on('change', this.onChange.bind(this));
		watcher.on('addDir', this.onAddDir.bind(this));
		watcher.on('unlinkDir', this.onUnlinkDir.bind(this));

		return watcher;
	}

	getRelativePath(path: string): string {
		return path.replace(`${this.visualRoot}`, '');
	}

	async onChange(filepath: string): Promise<void> {
		const relativePath = this.getRelativePath(filepath);
		const tasks = new Listr([{
			title: chalk.blue(`Updating "${relativePath}"...`),
			task: (ctx, task): Promise<void> => new Promise(async (resolve, reject) => {
				try {
					const config = {
						url: this.endpoints.store.url.replace(new RegExp('{path}', 'g'), relativePath),
						method: this.endpoints.store.method,
						cancelToken: this.getCancelToken(filepath),
						data: {
							content: fs.readFileSync(filepath, { encoding: 'utf8' }),
						},
					};

					await this.performRequest(config);

					task.title = chalk.green(`Updated "${relativePath}"`);

					resolve();
				} catch (error: any) {
					reject(error);
				}
			}),
		}]);

		await this.runTasks(tasks);
	}

	async onAdd(filepath: string, bundle: any): Promise<void> {
		const relativePath = this.getRelativePath(filepath);
		const tasks = new Listr([{
			title: chalk.blue(`Storing file "${relativePath}"...`),
			task: async (ctx, task): Promise<void> => new Promise(async (resolve, reject) => {
				try {
					const filename = path.basename(filepath);
					const formData = new FormData();

					formData.append('bundleId', bundle.id);
					formData.append('path', relativePath.replace(`/${filename}`, '') || '/');
					formData.append('files[]', fs.createReadStream(filepath), filename);

					const config = {
						url: this.endpoints.upload.url,
						method: this.endpoints.upload.method,
						cancelToken: this.getCancelToken(filepath),
						data: formData,
						headers: {
							'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
						}
					};

					await this.performRequest(config);

					task.title = chalk.green(`Stored file "${relativePath}"`);

					resolve();
				} catch (error: any) {
					reject(error);
				}
			}),
		}]);

		await this.runTasks(tasks);
	}

	async onUnlink(filepath: string): Promise<void> {
		await this.unlink(filepath);
	}

	async onAddDir(filepath: string): Promise<void> {
		const relativePath = this.getRelativePath(filepath);
		const tasks = new Listr([{
			title: chalk.blue(`Creating directory "${relativePath}"...`),
			task: async (ctx, task): Promise<void> => new Promise(async (resolve, reject) => {
				try {
					const config = {
						url: this.endpoints.mkdir.url.replace(new RegExp('{value}', 'g'), this.getRelativePath(filepath)),
						method: this.endpoints.mkdir.method,
						cancelToken: this.getCancelToken(filepath),
					};

					await this.performRequest(config);

					task.title = chalk.green(`Created directory "${relativePath}"`);

					resolve();
				} catch (error: any) {
					reject(error);
				}
			}),
		}]);

		await this.runTasks(tasks);
	}

	async onUnlinkDir(filepath: string): Promise<void> {
		await this.unlink(filepath);
	}

	async unlink(filepath: string): Promise<void> {
		const relativePath = this.getRelativePath(filepath);
		const tasks = new Listr([{
			title: chalk.blue(`Deleting "${relativePath}"...`),
			task: async (ctx, task): Promise<void> => new Promise(async (resolve, reject) => {
				try {
					const config = {
						url: this.endpoints.delete.url.replace(new RegExp('{value}', 'g'), relativePath),
						method: this.endpoints.delete.method,
						cancelToken: this.getCancelToken(filepath),
					};

					await this.performRequest(config);

					task.title = chalk.green(`Deleted "${relativePath}"`);

					resolve();
				} catch (error: any) {
					// in case of deleting a directory and all it's content multiple unlink are fired
					// and are not ordered properly, let's assume everything has been deleted since
					// rimraf is fired on backend
					if (error.response && error.response.data && error.response.data.code === 404) {
						task.title = chalk.green(`Deleted "${relativePath}"`);

						return resolve();
					}

					reject(error);
				}
			}),
		}]);

		await this.runTasks(tasks);
	}

	async runTasks(tasks: Listr): Promise<void> {
		try {
			await tasks.run();
		} catch (error: any) {
			Sentry.captureException(error);

			if (this.isDebugging) {
				if (error.response && error.response.data) {
					console.error(error.response.data);
				} else {
					console.error(error);
				}
			}
		}
	}
}
