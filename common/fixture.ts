import { test as base } from '@playwright/test';
import { FyleAccount } from './services/fyle/fyle-account.service';

// Extend basic test fixture with our custom fixture
export const test = base.extend<{ account: FyleAccount }>({
  // eslint-disable-next-line no-empty-pattern
  account: async ({}, use) => {
    // Set up the fixture (create the account)
    const account = await FyleAccount.create();

    // Use the fixture in the test
    await use(account);

    // Clean up after test (delete the account)
    await account.delete();
  },
});
