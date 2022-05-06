import { isLocal } from './configGetters';

export default function accountsUrl(url: string, isApiRoute: boolean = true): string {
	url = url.trim();
	// trim slashes
	url = url.replace(/^\/|\/$/g, '');

	const baseUrl = isLocal() ? 'http://localhost' : 'https://accounts.ddco.app';

	return `${baseUrl}${isApiRoute ? '/api/' : '/'}${url}`;
};
