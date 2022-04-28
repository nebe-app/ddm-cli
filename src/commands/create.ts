import inquirer from 'inquirer';
import chalk from 'chalk';
import axios from 'axios';
import fs from 'fs';
import simpleGit from 'simple-git';
import Listr from 'listr';
import * as Sentry from '@sentry/node';
import { Flags } from '@oclif/core';

import BaseCommand from '../BaseCommand';
import apiUrl from '../utils/apiUrl';
import { getRoot, getUsername, getPassword, setConfig, getConfig, getCommand } from '../utils/configGetters';

export class Create extends BaseCommand {
	static description = 'Creates new visual';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Create);
		const { debug } = flags;

		const root = getRoot();
		const username = getUsername();
		const password = getPassword();

		let response;

		try {
			response = await axios.get(apiUrl('brand'), {
				auth: { username, password }
			});

			if (debug) {
				console.log(response.data);
			}
		} catch (error: any) {
			Sentry.captureException(error);
			console.log(error);
			console.error(chalk.red(error.message));
			return;
		}

		const brands = response.data.brands;

		const brandAnswer = await inquirer.prompt({
			type: 'list',
			name: 'brand',
			message: 'Pro který brand založit kreativu?',
			// ToDo: better typing?
			choices: brands.map((brand: any) => {
				return {
					name: brand.name,
					value: brand.git_organization_name
				};
			})
		});

		const chosenBrand = brandAnswer.brand;

		const formatAnswer = await inquirer.prompt({
			type: 'list',
			name: 'format',
			message: 'V jakém výstupním formátu bude kreativa?',
			choices: [
				{ value: 'html', name: 'HTML5' },
				{ value: 'image', name: 'Obrázek (jpg, png)' },
				{ value: 'print', name: 'Tiskovina (pdf)' },
				{ value: 'video', name: 'Video (mp4, avi)' },
				{ value: 'audio', name: 'Audio (mp3, wav)' },
				{ value: 'fallback', name: 'Fallback (jpg)' }
			]
		});

		const chosenFormat = formatAnswer.format;

		/*const projectNameAnswer = await inquirer.prompt({
			type: 'input',
			name: 'projectName',
			message: `Interní číslo/identifikátor projektu (např. KLIENT_2020_05). Pokud ponecháte prázdné, nastaví se na rok a ID kreativy (např. 2020-0056). Slouží pro rozlišení mezi ostatními složkami pro vývojáře, není zobrazena ve webovém rozhraní.`
		});

		const projectName = projectNameAnswer.projectName;*/

		const nameAnswer = await inquirer.prompt({
			type: 'input',
			name: 'name',
			message: `Název kreativy. Veřejný, lze později změnit.`,
			validate: (input) => {
				return input && input.length > 3;
			}
		});

		const name = nameAnswer.name;

		const descriptionAnswer = await inquirer.prompt({
			type: 'input',
			name: 'description',
			message: `Popis kreativy (nepovinný)`
		});

		const description = descriptionAnswer.description;

		const tagsAnswer = await inquirer.prompt({
			type: 'input',
			name: 'tags',
			message: `Štítky kreativy (oddělujte čárkou, nepovinné)`
		});

		const tags = String(tagsAnswer.tags).split(',')
			.map((word) => {
				return word.trim();
			})
			.filter((word) => {
				return word.length > 0;
			});

		const payload = {
			git_organization_name: chosenBrand,
			output_category: chosenFormat,
			//project_name: projectName,
			name,
			description,
			tags
		};

		console.log(payload);

		const confirm = await inquirer.prompt({
			type: 'confirm',
			name: 'confirm',
			message: `Jsou data v pořádku?`,
			default: true
		});

		if (!confirm.confirm) {
			process.exit();
		}

		let createResponse: any = null;

		try {
			const tasks = new Listr([{
				title: 'Vytvářím kreativu',
				task: async () => {
					createResponse = await axios.request({
						method: 'POST',
						url: apiUrl('visual'),
						data: payload,
						auth: { username, password }
					});
				}
			}], { renderer: debug ? 'verbose' : 'default', })

			await tasks.run();
		} catch (error: any) {
			Sentry.captureException(error);
			console.error(error);
			console.error(chalk.red(error.response.data.message));
			console.error(chalk.red(JSON.stringify(error.response.data.errors)));
			return;
		}

		try {
			await fs.promises.mkdir(`${root}/src`);
		} catch (error) {
		}

		const origin = createResponse.data.visual.origin;
		const gitRepoName = createResponse.data.visual.git_repo_name;

		try {
			await fs.promises.mkdir(`${root}/src/${chosenBrand}`);
		} catch (error) {
		}

		const repoPath = `${root}/src/${chosenBrand}/${gitRepoName}`;

		const git = simpleGit();

		try {
			await fs.promises.mkdir(repoPath);
			await git.clone(origin, repoPath, {});
			console.log(chalk.green('Repozitář naklonován'));
		} catch (error: any) {
			Sentry.captureException(error);
			console.error(error);
			return;
		}

		console.log(chalk.green(`Repozitář: ${repoPath}`));

		const configContents: any = {
			name: name,
			description: description,
			format: chosenFormat,
			tags: tags
		};

		if (chosenFormat === 'fallback') {
			configContents.fallback_click_tag = '';
		}

		fs.writeFileSync(`${repoPath}/config.json`, JSON.stringify(configContents, null, '\t'));
		fs.writeFileSync(`${repoPath}/schema.json`, JSON.stringify({}, null, '\t'));

		await git.cwd(repoPath);

		/**
		 * Set user.name + user.email for repo
		 */
		const userName = getConfig('name');

		if (userName) {
			await git.addConfig('user.name', userName);
		}

		const userEmail = getConfig('email');

		if (userEmail) {
			await git.addConfig('user.email', userEmail);
		}

		/**
		 * Commit and push first commit
		 */
		await git.add('./*');
		await git.commit('Init commit');
		await git.push('origin', 'master');

		console.log(chalk.green(`Vytvořen config.json a pushnul jsem první commit`));

		setConfig('newestVisual', `${chosenBrand}/${gitRepoName}`);

		console.log(chalk.green(`Šablony kreativ naleznete na https://github.com/nebe-app`));
		console.log(chalk.green(`Po vykopírování šablony spustíte vývoj příkazem: ${getCommand('dev --newest')} `));
	}
}
