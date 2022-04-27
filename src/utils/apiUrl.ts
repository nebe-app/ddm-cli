import { isSazka, isLocal } from './configGetters';

export default function apiUrl(url: string): string {
  url = url.trim();
  // trim slashes
  url = url.replace(/^\/|\/$/g, '');

  if (isLocal()) {
    return `http://localhost:8000/api/public/cli/${url}`;
  }

  return isSazka()
    ? `https://sazka.nebe.app/api/public/cli/${url}`
    : `https://client.nebe.app/api/public/cli/${url}`;
};
