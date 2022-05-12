import chalk from 'chalk';

import BaseCommand from './BaseCommand';
import accountsUrl from './utils/accountsUrl';
import { setUser } from './utils/configGetters';
import { User } from './types/authenticatedCommand';

export default abstract class AuthenticatedCommand extends BaseCommand {
	protected user: User | null = null;

	async init(): Promise<void> {
		await super.init();

		try {
			const { data: user } = await this.performRequest({
				url: accountsUrl('user'),
				method: 'GET',
			});

			this.user = user as User;

			setUser(this.user);
		} catch (error: any) {
			// ToDo: attempt to refresh token
			this.reportError(error);

			return await this.exitHandler(1);
		}
	}
};
