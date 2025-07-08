import { test as teardown } from '@playwright/test';
import { FyleAccount } from '../services/fyle/fyle-account.service';

// eslint-disable-next-line no-empty-pattern
teardown('Integration tests teardown', async ({}) => {
  const account = new FyleAccount(process.env.INTEGRATION_TESTS_EMAIL);
  await account.delete(true);
});
