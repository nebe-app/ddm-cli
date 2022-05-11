import axios from 'axios';
import * as Sentry from '@sentry/node';

import AuthenticatedCommand from '../AuthenticatedCommand';
import { getUsername, getPassword } from '../utils/configGetters';
import apiUrl from '../utils/apiUrl';

export class TestCliController extends AuthenticatedCommand {
	static description = 'Test whether CLI Controller in app is working';

	// hide the command from help
	static hidden = true

	async run(): Promise<void> {
		const username = getUsername();
		const password = getPassword();

		try {
			const { data } = await axios.get(apiUrl('visual'), {
				auth: { username, password }
			});

			console.log(data);
		} catch (error) {
			Sentry.captureException(error);
			console.log(error);
		}
	}
}
