import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import { Flags } from '@oclif/core';

import BaseCommand from '../BaseCommand';
import getDirectories from '../utils/getDirectories';
import { getRoot } from '../utils/configGetters';
import Listr, { ListrContext, ListrTask, ListrTaskWrapper } from 'listr';

export class Push extends BaseCommand {
	static description = 'Push all local visuals';

	static flags = {
		debug: Flags.boolean({ char: 'd', description: 'Debug mode', required: false, default: false }),
	}

	async run(): Promise<void> {
		const { flags } = await this.parse(Push);
		const { debug } = flags;

		const root: string = getRoot();
		const brandFolders: string[] = await getDirectories(path.join(root, 'src'));
		const tasks: ListrTask[] = [];
		const brands: string[] = brandFolders.filter((folder: string) => {
			return folder[0] !== '.';
		});

		for (let brandIndex in brands) {
			if (!brands.hasOwnProperty(brandIndex)) {
				continue;
			}

			const brand: string = brands[brandIndex];
			const visualFolders: string[] = await getDirectories(path.join(root, 'src', brand));
			const visuals: string[] = visualFolders.filter((folder: string) => {
				return folder[0] !== '.';
			});

			for (let visualIndex in visuals) {
				if (!visuals.hasOwnProperty(visualIndex)) {
					continue;
				}

				const visual: string = visuals[visualIndex];
				const visualPath: string = path.join(root, 'src', brand, visual);

				tasks.push({
					title: `Pushing ${visualPath}`,
					task: async (ctx: ListrContext, task: ListrTaskWrapper) => await this.push(visualPath, task),
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

	async push(visualPath: string, task: ListrTaskWrapper): Promise<void> {
		const git = simpleGit();

		if (!fs.existsSync(path.join(visualPath, '.git'))) {
			return;
		}

		await git.cwd(visualPath);
		const status = await git.status();

		if (status.files.length) {
			await git.add('./*');
			await git.commit(`Changes`);
			await git.push('origin', 'master');
		} else {
			task.skip('No changes, skipping');
		}
	}
}
