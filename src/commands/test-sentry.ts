import BaseCommand from '../BaseCommand';
import * as Sentry from '@sentry/node';

export class TestSentry extends BaseCommand {
  static description = 'Test whether Sentry error reporting is working';

  async run(): Promise<void> {
    Sentry.captureMessage('Test');
    console.log('OK');
    throw new Error('Ahoj');
  }
}
