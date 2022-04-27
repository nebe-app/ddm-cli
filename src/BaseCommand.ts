import * as Sentry from '@sentry/node';
import path from 'path';
import { Command } from '@oclif/core';
import { readFileSync } from 'fs';

export default abstract class BaseCommand extends Command {
	async init(): Promise<void> {
		const packageJson = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

		Sentry.init({
			dsn: 'https://ac078c61624944c8a56ce290ffdb5dd8@o170788.ingest.sentry.io/5432248',
			release: `ddm-cli@${packageJson.version}`,
			// @ts-ignore
			tags: { version: packageJson.version },
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
