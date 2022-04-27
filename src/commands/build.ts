import Bundler from 'parcel-bundler';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';
import inquirer from 'inquirer';
import * as Sentry from '@sentry/node';

import BaseCommand from '../BaseCommand';
import getFill from '../utils/getFill';
import getDirectories from '../utils/getDirectories';
import checkBrowsersList from '../utils/checkBrowserList';
import { getRoot } from '../utils/configGetters';

export class Build extends BaseCommand {
	static description = 'Build visuals';

	// hide the command from help
	static hidden = true;

	async run(): Promise<void> {
		await checkBrowsersList();

		const root = getRoot();
		const bundlerFolder = path.join(root);

		try {
			await fs.promises.mkdir(bundlerFolder);
		} catch (error) {
		}

		process.chdir(bundlerFolder);

		const brandFolders = await getDirectories(path.join(root, 'src'));
		const brands = brandFolders.filter((folder: string) => folder[0] !== '.');

		if (!brands.length) {
			console.error('No brands');
			process.exit();
		}

		let selectedBrand;

		if (brands.length === 1) {
			selectedBrand = brands[0].toString().replace(`${root}/src/`, '');
		} else {
			const brandsQuestion = {
				type: 'list',
				name: 'selectedBrand',
				message: 'Select brand',
				choices: brands.map((folder: string) => folder.toString().replace(`${root}/src/`, '')),
			};

			const brandAnswers = await inquirer.prompt([brandsQuestion]);
			selectedBrand = brandAnswers.selectedBrand;
		}

		fs.removeSync(path.join(root, 'dist-build'));

		/**
		 * Configs
		 */
		const configs = glob.sync(`${root}/src/${selectedBrand}/[!_]*/config.*`, {});

		console.log(`${root}/src/${selectedBrand}/[!_]*/config.*`);

		for (let i = 0; i < configs.length; i++) {
			const relativePath = configs[i].replace(`${root}/src/`, '');
			fs.copySync(configs[i], `${root}/dist-build/${relativePath}`);
		}

		console.log(`Copied ${configs.length} configs`);

		/**
		 * Include folders
		 */
		const includes = glob.sync(`${root}/src/${selectedBrand}/[!_]*/include/`, {});

		for (let i = 0; i < includes.length; i++) {
			const relativePath = includes[i].replace(`${root}/src/`, '');
			fs.copySync(includes[i], `${root}/dist-build/${relativePath}`);
		}

		console.log(`Copied ${includes.length} include folders`);

		/**
		 * VisualSizes
		 */
		const folders = glob.sync(`${root}/src/${selectedBrand}/[!_]*/[!_]*/index.html`, {});

		console.log(`Bundling ${folders.length} visual sizes`);

		for (let i = 0; i < folders.length; i++) {
			const entryPoint = folders[i];

			const folder = entryPoint.toString()
				.replace('/index.html', '')
				.replace(`${root}/src/`, '');

			const schemaPath = `${folder}/../schema.json`;

			let fill = getFill(schemaPath);

			try {
				const options = {
					outDir: `${root}/dist-build/${folder}`,
					outFile: 'index.html',
					publicUrl: '.',
					watch: false,
					cache: true,
					cacheDir: `${bundlerFolder}/.cache`,
					minify: true,
					logLevel: 2,
					autoInstall: true,
					contentHash: false,
					global: 'VISUAL',
					scopeHoist: false,
					target: 'browser',
					bundleNodeModules: false,
					hmr: false,
					sourceMaps: false,
					detailedReport: false,
				};
				// @ts-ignore
				const bundler = new Bundler(entryPoint, options);

				bundler.on('bundled', (bundle) => {
					let markupContents = fs.readFileSync(`${root}/dist-build/${folder}/index.html`).toString();

					const containsClickTag = markupContents.indexOf('window.clickTag') !== -1;

					if (!containsClickTag) {
						console.error(`${folder} does not have clickTag`);
					}

					markupContents = markupContents
						.replace(/<!--NEBE_DEMO_FILL-->.+<!--\/NEBE_DEMO_FILL-->/g, '')
						.replace(`</body>`, `\n<!--NEBE_DEMO_FILL-->\n${fill}\n<!--/NEBE_DEMO_FILL-->\n</body>`);

					const exitScript = `<script>window.EXIT=function(url){if(!url)url=window.clickTag;window.open(url);};</script>`;
					markupContents = markupContents
						.replace(/<!--NEBE_EXIT-->.+<!--\/NEBE_EXIT-->/g, '')
						.replace(`</body>`, `\n<!--NEBE_EXIT-->\n${exitScript}\n<!--/NEBE_EXIT-->\n</body>`);

					fs.writeFileSync(`${root}/dist-build/${folder}/index.html`, markupContents);
				});

				await bundler.bundle();
				console.log(`${i + 1}/${folders.length} Bundled ${folder}`);

			} catch (error) {
				Sentry.captureException(error);
				console.error(`${i + 1}/${folders.length} Error ${folder}`);
			}
		}
	}
}
