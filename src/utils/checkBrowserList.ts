import fs from 'fs-extra';
import { getRoot } from './configGetters';

export default function checkBrowsersList() {
	const root = getRoot();

	if (!root) {
		return false;
	}

	const browserslist = ['last 3 Chrome versions'];

	try {
		const packageJson = fs.readFileSync(`${root}/package.json`);
		const packageJsonContents = JSON.parse(packageJson.toString());

		if (!packageJsonContents.browserslist || JSON.stringify(packageJsonContents.browserslist) !== JSON.stringify(browserslist)) {
			packageJsonContents.browserslist = browserslist;
			fs.writeFileSync(`${root}/package.json`, JSON.stringify(packageJsonContents, null, '\t'));
			console.log(`Aktualizoval jsem browserslist v package.json`);
		}

	} catch (error) {
		fs.writeFileSync(`${root}/package.json`, JSON.stringify({ browserslist }, null, '\t'));
		console.log(`Vytvořil jsem browserslist v package.json`);
	}

	return true;
};
