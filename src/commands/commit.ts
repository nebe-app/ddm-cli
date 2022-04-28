import path from 'path';
import fs from 'fs';
import simpleGit from 'simple-git';
import Table from 'cli-table';

import BaseCommand from '../BaseCommand';
import getDirectories from '../utils/getDirectories';
import { getRoot } from '../utils/configGetters';
import chalk from 'chalk';

export class Commit extends BaseCommand {
	static description = 'Commit changes to the repository';

	// hide the command from help
	static hidden = true

	async run(): Promise<void> {
		const root = getRoot();
		const git = simpleGit();
		const brandFolders = await getDirectories(path.join(root, 'src'));

		const brands = brandFolders.filter((folder) => {
			return folder[0] !== '.';
		});

		const table = new Table({
			head: ['Organization', 'Visual', 'Branch', 'Status']
		});

		let tableContainsRows = false;

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

				if (!fs.existsSync(path.join(visualPath, '.git'))) {
					continue;
				}

				try {
					await git.cwd(visualPath);

					const status = await git.status();

					if (status.files.length) {
						const fileNames = status.files.map((file) => file.path).join(', ');
						const currentBranch = status.current === 'master'
							? status.current
							: chalk.yellow(`${status.current} (not on master)`);

						table.push([brand, visual, currentBranch, `Changed ${status.files.length} files: ${fileNames}`]);
						tableContainsRows = true;

						await git.add('./*');
						await git.commit(`Changed files: ${fileNames}`);
						await git.push('origin', 'master');
					}

				} catch (error: any) {
					table.push([brand, visual, 'Error: ' + error.toString()]);
					tableContainsRows = true;
				}
			}
		}

		if (tableContainsRows) {
			console.log(table.toString());
		} else {
			console.log(chalk.green(`Nothing to commit/push`));
		}
	}
}
