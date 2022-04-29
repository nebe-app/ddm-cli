import { isLocal } from './configGetters';

export default function accountsUrl(url: string): string {
	url = url.trim();
	// trim slashes
	url = url.replace(/^\/|\/$/g, '');

	if (isLocal()) {
		return `http://localhost/api/${url}`;
	}

	return `https://accounts.ddco.app/api/${url}`;
};
