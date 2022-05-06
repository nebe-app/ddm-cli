import config from './config';
import { Token } from '../types/login';

const isSazka = function (): boolean {
	const [, , ...args] = process.argv;

	return args && args.join(' ').indexOf('--sazka') !== -1;
}

const isLocal = function (): boolean {
	const [, , ...args] = process.argv;

	return args && args.join(' ').indexOf('--local') !== -1;
}

const getRoot = function (): string {
	return isSazka() ? config.get('rootSazka') : config.get('root');
}

const getLastDev = function (): string {
	return isSazka() ? config.get('lastDevSazka') : config.get('lastDev');
}

const getUsername = function (): string {
	return isSazka() ? config.get('usernameSazka') : config.get('username');
}

const getPassword = function (): string {
	return isSazka() ? config.get('passwordSazka') : config.get('password');
}

const getConfig = function (name: string): any {
	return isSazka() ? config.get(`${name}Sazka`) : config.get(name);
}

const getAccessToken = function (): string | null {
	const token: Token | null = getConfig('token');

	if (!token) {
		return null;
	}

	return `${token.token_type} ${token.access_token}`;
}

const setConfig = function (key: string, value: any): void {
	return isSazka() ? config.set(`${key}Sazka`, value) : config.set(key, value);
}

const getBin = function (): string {
	return isSazka() ? 'nebe-sazka' : 'nebe';
}

const getCommand = function (command: string): string {
	return isSazka() ? `ddm ${command} --sazka` : `ddm ${command}`;
}

export { isSazka, isLocal, getRoot, getLastDev, getUsername, getPassword, setConfig, getConfig, getAccessToken, getBin, getCommand };
