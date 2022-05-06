import * as Sentry from '@sentry/node';
import { Command } from '@oclif/core';

export default abstract class BaseCommand extends Command {
	async init(): Promise<void> {
		Sentry.init({
			dsn: 'https://02902c9ddb584992a780788c71ba5cd7@o562268.ingest.sentry.io/6384635',
			release: `ddm-cli@${this.config.pjson.version}`,
			// @ts-ignore
			tags: { version: this.config.pjson.version },
			environment: process.env.NODE_ENV,
			config: {
				captureUnhandledRejections: true
			},
		});
	}

	async catch(error: any): Promise<void> {
		Sentry.captureException(error);
		super.catch(error);
	}

	async finally(): Promise<void> {
		Sentry.close();
	}
};
