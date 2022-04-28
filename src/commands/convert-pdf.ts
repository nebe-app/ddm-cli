import fs from 'fs-extra';
import glob from 'glob';
import inquirer from 'inquirer';
import path from 'path';
import chalk from 'chalk';
import which from 'which';
import Listr from 'listr';
import { Flags } from '@oclif/core';
import { fromPath } from 'pdf2pic';

import BaseCommand from '../BaseCommand';
import getDirectories from '../utils/getDirectories';
import { getRoot } from '../utils/configGetters';

export class ConvertPdf extends BaseCommand {
	static description = 'Convert pdf to jpg';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(ConvertPdf);
		const { debug } = flags;

		try {
			const resolvedGmPath = await which('gm');

			if (debug) {
				console.log(chalk.blue(`Using binary for gm: ${resolvedGmPath}`));
			}
		} catch (error) {
			console.error(error);
			console.error(chalk.red(`Není nainstalován GraphicsMagick (gm)! https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md`));
			process.exit(1);
			return;
		}

		try {
			const resolvedGsPath = await which('gs');

			if (debug) {
				console.log(chalk.blue(`Using binary for gs: ${resolvedGsPath}`));
			}
		} catch (error) {
			console.error(error);
			console.error(chalk.red(`Není nainstalován GhostScript (gs)! https://github.com/yakovmeister/pdf2image/blob/HEAD/docs/gm-installation.md`));
			process.exit(1);
			return;
		}

		const visualPath = await this.selectVisual();

		const root = getRoot();
		const pdfs = glob.sync(`${root}/src/${visualPath}/[!_][0-9]*/*.pdf`);

		console.log(chalk.blue(`Converting ${pdfs.length} pdfs`));

		const tasks: any[] = [];

		for (let i = 0; i < pdfs.length; i++) {
			const pdf = pdfs[i];

			tasks.push({
				title: `Converting ${pdf}`,
				task: async () => this.convertPdf(pdf, root, visualPath),
			});
		}

		const runner = new Listr(tasks, {
			concurrent: true,
			renderer: debug ? 'verbose' : 'default',
		});

		await runner.run();
	}

	async convertPdf(pdf: string, root: string, visualPath: string) {
		const fileName = pdf.toString().replace(`${root}/src/${visualPath}/`, '');

		const parts1 = fileName.split('mm'); // @variant
		const parts3 = parts1[1].split('/');
		const filenameWithExtension = parts3[1];
		const parts2 = parts1[0].split('x').map((value: string) => parseInt(value, 10));

		const filename = filenameWithExtension.replace('.pdf', '');
		const width = parts2[0];
		const height = parts2[1];

		const dpi = 300;
		const pixelWidth = Math.round(width * dpi / 25.4);
		const pixelHeight = Math.round(height * dpi / 25.4);

		const savePath = `${root}/src/${visualPath}/${width}x${height}mm${parts3[0]}`;

		const pdf2picOptions = {
			density: dpi,
			savePath,
			saveFilename: filename,
			format: `jpg`,
			width: pixelWidth,
			height: pixelHeight
		};

		// generate convert command by pdf2pic
		const convert = await fromPath(`${savePath}/${filename}.pdf`, pdf2picOptions);
		// actually convert pdf to image
		await convert(1);

		await fs.promises.rename(`${savePath}/${filename}.1.jpg`, `${savePath}/${filename}.jpg`);
	}

	async selectVisual() {
		const root = getRoot();

		const brandFolders = await getDirectories(path.join(root, 'src'));
		const brands = brandFolders.filter((folder) => {
			return folder[0] !== '.';
		});

		if (!brands.length) {
			console.error('No brands');
			process.exit();
		}

		let selectedBrand: string | null = null;

		if (brands.length === 1) {
			selectedBrand = brands[0];
		} else {
			const brandChoices = {
				type: 'list',
				name: 'selectedBrand',
				message: 'Select brand',
				choices: brands.map((folder: string) => folder.toString()
					.replace(`${root}/src/`, '')
					.replace('/brand.json', ''))
			};

			const brandAnswers = await inquirer.prompt([brandChoices]);
			selectedBrand = brandAnswers.selectedBrand;

			console.log(selectedBrand);
		}

		if (selectedBrand === null) {
			console.error(chalk.red('No brand selected'));
			process.exit();
		}

		// Visual

		const visualFolders = await getDirectories(path.join(root, 'src', selectedBrand));
		const visuals = visualFolders.filter((folder) => {
			return folder[0] !== '.';
		});

		if (!visuals.length) {
			console.error(chalk.red('No visuals'));
			process.exit();
		}

		visuals.reverse();

		const visualsChoices = {
			type: 'list',
			name: 'first',
			message: 'Select visual',
			choices: visuals.map((visualPath: string) => visualPath
				.toString()
				.replace(`${root}/src/${selectedBrand}/`, '')
				.replace(`/`, '')
			)
		};

		const visualAnswers = await inquirer.prompt([visualsChoices]);
		const selectedVisual = visualAnswers.first;

		return `${selectedBrand}/${selectedVisual}`;
	};
}
