import Bundler from 'parcel-bundler';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import tcpPortUsed from 'tcp-port-used';
import notifier from 'node-notifier';
import express from 'express';
import simpleGit from 'simple-git';
import rimraf from 'rimraf';
import Listr from 'listr';
import * as Sentry from '@sentry/node';

import BaseCommand from '../BaseCommand';
import getFill from '../utils/getFill';
import checkConfig from '../utils/checkConfig';
import checkSchema from '../utils/checkSchema';
import selectVisual from '../utils/selectVisual';
import { getRoot, getLastDev, getConfig, setConfig, isSazka } from '../utils/configGetters';
import { Flags } from '@oclif/core';
import ParcelBundler from 'parcel-bundler';

export class Dev extends BaseCommand {
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
			char: 'l',
			description: 'Start dev with latest edited visual',
			required: false,
			default: false
		}),
		local: Flags.boolean({
			char: 'o',
			description: 'Start dev against local api',
			hidden: true,
			required: false,
			default: false
		}),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Dev);
		const { debug, newest, latest, local } = flags;

		// Check port

		const basePort = isSazka() ? 1300 : 1200;
		const portsToCheck = [basePort, 1400];

		for (let i in portsToCheck) {
			if (!portsToCheck.hasOwnProperty(i)) {
				continue;
			}

			const port: number = parseInt(i);

			try {
				const inUse = await tcpPortUsed.check(portsToCheck[port], '127.0.0.1');

				if (inUse) {
					console.error(chalk.red(`🛑 Port ${portsToCheck[port]} není dostupný, pravděpodobně již běží jiná instance NEBE dev stacku!`));
					notifier.notify({
						title: 'Nelze spustit devstack',
						message: `🛑 Port ${portsToCheck[port]} není dostupný, pravděpodobně již běží jiná instance NEBE dev stacku!`,
						sound: true,
						icon: path.join(__dirname, '../assets/logo.png')
					});
					process.exit();
				}
			} catch (error: any) {
				console.log(chalk.yellow(`Chyba při zjišťování, zda je port ${portsToCheck[port]} dostupný, pokračuji`));
				console.log(error.message);
			}
		}

		// Prepare folder

		const root = getRoot();
		const bundlerFolder = path.join(root);

		await this.prepareFolder();

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
		fs.removeSync(path.join(bundlerFolder, 'dist'));

		// Git

		const git = simpleGit();
		await git.cwd(`${root}/src/${visualPath}`);
		const gitStatus = await git.status();

		/*
		State
		 */
		// ToDo: better typings
		let state: any = {
			gitStatus,
			visualPath
		};

		/*
		 * Server
		 */
		const app = express();

		app.get('/state', (request, response) => {
			response.set('Access-Control-Allow-Origin', '*');
			response.send(state);
		});

		app.listen(1400);

		/**
		 * Config
		 */
		const configPath = `${root}/src/${visualPath}/config.json`;
		const configResult = await checkConfig(configPath);

		if (!configResult) {
			process.exit(1);
		}

		const destConfigPath = `${bundlerFolder}/dist/${visualPath}/config.json`;
		fs.copySync(configPath, destConfigPath);
		state.config = fs.readJsonSync(configPath);

		/**
		 * Include folders
		 */
		const includes = glob.sync(`${root}/src/${visualPath}/include/`);
		for (let i = 0; i < includes.length; i++) {
			const path = includes[i];
			const relativePath = path.toString().replace(`${root}/src/${visualPath}/`, '');
			fs.copySync(path, `${bundlerFolder}/dist/${relativePath}`);
		}

		/**
		 * Get fill
		 */
		const schemaPath = `${root}/src/${visualPath}/schema.json`;
		await checkSchema(schemaPath, state);
		let fill = getFill(schemaPath);

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

		console.log(`Serving ${folders.length} visual sizes`);

		state.folders = folders;

		// Fetch visual info

		try {
			state.visual = {};
		} catch (error) {
			console.error();
		}

		let bundlers: ParcelBundler[] = [];

		rimraf.sync(bundlerFolder + '/.cache');
		//await fs.promises.mkdir(bundlerFolder + '/.cache');

		// Select resizes
		const folderChoices = {
			type: 'checkbox',
			name: 'folders',
			message: 'Select resizes',
			choices: folders.map((folder) => {
				return {
					name: folder.toString()
						.replace(`${root}/src/${visualPath}/`, '')
						.replace('/index.html', ''),
					checked: true
				};
			})
		};
		const folderAnswers = await inquirer.prompt([folderChoices]);
		const selectedFolders = folderAnswers.folders;

		if (selectedFolders.length === 0) {
			console.error('🛑 Nevybrány žádné rozměry');

			notifier.notify({
				title: 'Nelze spustit devstack',
				message: `🛑 Nevybrány žádné rozměry`,
				sound: true,
				icon: path.join(__dirname, '../assets/logo.png')
			});
			process.exit();
		}

		console.log(`Running bundlers for resizes: ${selectedFolders}`);

		state.bundlers = {};
		const tasks = [];

		for (let i in selectedFolders) {
			if (!selectedFolders.hasOwnProperty(i)) {
				continue;
			}

			const folder = selectedFolders[i];
			const port = basePort + parseInt(i);

			tasks.push({
				title: `Serving ${folder} on http://localhost:${port}`,
				task: async () => {
					const {
						results,
						bundler
					} = await this.startBundler(
						root,
						visualPath,
						bundlerFolder,
						folder,
						port,
						fill,
						debug,
						local
					);

					state.bundlers[i] = results;

					if (bundler) {
						bundlers.push(bundler);
					}
				}
			})
		}

		const runner = new Listr(tasks, { renderer: debug ? 'verbose' : 'default' });

		await runner.run();

		console.log('Listening to file changes... Press Ctrl+C to stop servers');

		if (fs.existsSync(schemaPath)) {
			fs.watch(schemaPath, {}, async () => {
				console.log('Schema changed, checking and rebundling...');

				setTimeout(async () => {
					await checkSchema(schemaPath, state);
					fill = getFill(schemaPath);
					bundlers.forEach(bundler => bundler.bundle());
				}, 200);
			});
		}

		fs.watch(configPath, {}, async () => {
			console.log('Config changed, validating');
			await checkConfig(configPath);
		});
	}

	async prepareFolder() {
		const root = getRoot();
		const bundlerFolder = path.join(root);

		try {
			await fs.promises.mkdir(bundlerFolder);
		} catch (error) {
		}

		process.chdir(bundlerFolder);
	};

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
			message: 'Use last visual? ' + lastVisualContent,
			choices: [
				'Ano',
				'Ne'
			]
		});

		return lastVisualAnswers.first === 'Ano' ? lastVisualContent : null;
	}

	async startBundler(
		root: string,
		visualPath: string | null,
		bundlerFolder: string,
		folder: string,
		port: number,
		fill: any,
		debug: boolean,
		local: boolean
	): Promise<any> {
		const entryPoint = `${root}/src/${visualPath}/${folder}/index.html`;
		const results: any = {
			folder,
		};

		try {
			const options = {
				outDir: `${bundlerFolder}/dist/${folder}`,
				outFile: 'index.html',
				publicUrl: '/',
				watch: true,
				cache: false,
				//cacheDir: bundlerFolder + '/.cache/' + i,
				minify: true,
				logLevel: 2,
				autoInstall: true,

				contentHash: false,
				global: 'VISUAL',
				scopeHoist: false,
				target: 'browser',
				bundleNodeModules: false,
				hmr: true,
				sourceMaps: true,
				detailedReport: true
			};
			// @ts-ignore
			const bundler = new Bundler(entryPoint, options);

			bundler.on('buildStart', (entryPoints) => {
				if (debug) {
					console.log(`${folder} buildStart ${JSON.stringify(entryPoints)}`);
				}
			});

			bundler.on('buildError', (error) => {
				console.log(`${folder} buildError`);
				console.error(error);
			});

			bundler.on('buildEnd', () => {
				if (debug) {
					console.log(`${folder} buildEnd`);
				}
			});

			bundler.on('bundled', (bundle) => {
				if (debug) {
					//console.log(bundle.childBundles);
				}

				const visualClientScript = local
					? `<script src="http://localhost:1236/visual-client.min.js?cb=${new Date().getTime()}"></script>`
					: `<script src="https://cdn.nebe.app/store/serving/dist/visual-client.min.js?cb=${new Date().getTime()}"></script>`;

				if (debug) {
					console.log(`Using VisualClient on URL ${visualClientScript}`);
				}

				let markupContents: string = fs.readFileSync(`${options.outDir}/index.html`).toString();

				if (markupContents.indexOf('<!--NEBE_POLYFILLS-->') === -1) {
					debug ? console.log('Adding NEBE_POLYFILLS to markup') : true;
					markupContents = markupContents.replace(`</head>`, `\n<!--NEBE_POLYFILLS--><script src="https://cdnjs.cloudflare.com/ajax/libs/promise-polyfill/8.1.3/polyfill.min.js"></script><script src="https://cdn.jsdelivr.net/npm/regenerator-runtime@0.13.7/runtime.min.js"></script><!--/NEBE_POLYFILLS-->\n</head>`);
				} else {
					debug ? console.log('NEBE_POLYFILLS already in markup') : true;
				}

				if (markupContents.indexOf('<!--NEBE_DEMO_FILL-->') === -1) {
					debug ? console.log('Adding NEBE_DEMO_FILL to markup') : true;
					markupContents = markupContents.replace(`</body>`, `\n<!--NEBE_DEMO_FILL-->\n${fill}\n<!--/NEBE_DEMO_FILL-->\n</body>`);
				} else {
					debug ? console.log('NEBE_DEMO_FILL already in markup') : true;
				}

				if (markupContents.indexOf('<!--NEBE_VISUAL_CLIENT-->') === -1) {
					debug ? console.log('Adding NEBE_VISUAL_CLIENT to markup') : true;
					markupContents = markupContents.replace(`</head>`, `\n<!--NEBE_VISUAL_CLIENT-->\n${visualClientScript}\n<!--/NEBE_VISUAL_CLIENT-->\n</head>`);
				} else {
					debug ? console.log('NEBE_VISUAL_CLIENT already in markup') : true;
				}

				if (markupContents.indexOf('<!--NEBE_ENV-->') === -1) {
					debug ? console.log('Adding NEBE_ENV to markup') : true;
					// ToDo: investigate why this is not working
					// @ts-ignore
					markupContents = markupContents.replace(`</head>`, `\n<!--NEBE_ENV-->\n<script>window.MODE = 'dev'; window.FOLDER = '${folder}';</script>\n<!--/NEBE_ENV-->\n</head>`);
				} else {
					debug ? console.log('NEBE_ENV already in markup') : true;
				}

				if (markupContents.indexOf('<!--NEBE_DOCUMENT_TITLE-->') === -1) {
					debug ? console.log('Adding NEBE_DOCUMENT_TITLE to markup') : true;
					markupContents = markupContents.replace(`</head>`, `\n<!--NEBE_DOCUMENT_TITLE-->\n<script>document.title = "${folder} ${visualPath}";</script>\n<!--/NEBE_DOCUMENT_TITLE-->\n</head>`);
				} else {
					debug ? console.log('NEBE_DOCUMENT_TITLE already in markup') : true;
				}

				// Helper

				const visualHelperUrl = local ? 'http://localhost:1235/' : 'https://cdn.nebe.app/store/utils/dist/';

				if (debug) {
					console.log(`Using VisualHelper on URL ${visualHelperUrl}`);
				}

				if (markupContents.indexOf('<!--NEBE_VISUAL_HELPER-->') === -1) {
					debug ? console.log('Adding NEBE_VISUAL_HELPER to markup') : true;
					markupContents = markupContents.replace(`</head>`, `\n<!--NEBE_VISUAL_HELPER-->\n<link rel="stylesheet" href="${visualHelperUrl}visual-helper.min.css" type="text/css">\n<script src="${visualHelperUrl}visual-helper.min.js"></script>\n<!--/NEBE_VISUAL_HELPER-->\n</head>`);
				} else {
					debug ? console.log('NEBE_VISUAL_HELPER already in markup') : true;
				}

				// Write it

				fs.writeFileSync(`${options.outDir}/index.html`, markupContents);

				if (markupContents.indexOf('<main>') === -1 && markupContents.indexOf('<main ') === -1) {
					console.error(chalk.red(`Resize ${folder} does not contain element <main>!`));
				}
			});

			await bundler.serve(port);

			results.error = false;
			results.port = port;

			return { results, bundler };
		} catch (error) {
			Sentry.captureException(error);
			console.error(`Error ${folder}`);

			console.error(error);
			results.error = false;
		}

		return { results, bundler: null };
	}
}
