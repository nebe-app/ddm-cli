import * as Sentry from '@sentry/node';
import { Command } from '@oclif/core';

export default abstract class BaseCommand extends Command {
	async init(): Promise<void> {
		Sentry.init({
			dsn: 'https://ac078c61624944c8a56ce290ffdb5dd8@o170788.ingest.sentry.io/5432248',
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
