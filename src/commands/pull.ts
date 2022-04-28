import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';

import BaseCommand from '../BaseCommand';
import getDirectories from '../utils/getDirectories';
import { getRoot } from '../utils/configGetters';
import Listr, { ListrTask } from 'listr';
import { Flags } from '@oclif/core';

export class Pull extends BaseCommand {
	static description = 'Pull all visuals';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Pull);
		const { debug } = flags;

		const root = getRoot();
		const brandFolders = await getDirectories(path.join(root, 'src'));
		const tasks: ListrTask[] = [];
		const brands = brandFolders.filter((folder) => {
			return folder[0] !== '.';
		});

		for (let brandIndex in brands) {
			if (!brands.hasOwnProperty(brandIndex)) {
				continue;
			}

			const brand = brands[brandIndex];
			const visualFolders = await getDirectories(path.join(root, 'src', brand));

			const visuals = visualFolders.filter((folder) => {
				return folder[0] !== '.';
			});

			for (let visualIndex in visuals) {
				if (!visuals.hasOwnProperty(visualIndex)) {
					continue;
				}

				const visual = visuals[visualIndex];
				const visualPath = path.join(root, 'src', brand, visual);

				tasks.push({
					title: `Fetching & pulling ${visualPath}`,
					task: async () => await this.fetchAndPull(visualPath),
				})
			}
		}

		const runner = new Listr(tasks, {
			concurrent: true,
			exitOnError: false,
			renderer: debug ? 'verbose' : 'default'
		});

		try {
			await runner.run();
		} catch (error) {
			// do nothing (this is here to silence ugly errors thrown into the console, listr prints errors in a pretty way)
		}
	}

	async fetchAndPull(visualPath: string) {
		const git = simpleGit();

		if (!fs.existsSync(path.join(visualPath, '.git'))) {
			return;
		}

		await git.cwd(visualPath);
		await git.fetch();
		await git.pull();
	}
}