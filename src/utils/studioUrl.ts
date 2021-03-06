import { isLocal } from './configGetters';

export default function studioUrl(url: string): string {
	url = url.trim();
	// trim slashes
	url = url.replace(/^\/|\/$/g, '');

	const baseUrl = isLocal() ? 'http://localhost:8060' : 'https://studio.imagelance.com';

	return `${baseUrl}/${url}`;
};
