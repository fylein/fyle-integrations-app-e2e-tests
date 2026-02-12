import { test as base } from '@playwright/test';
import { FyleAccount } from '../common/services/fyle/fyle-account.service';

// Extend basic test fixture with our custom fixture
export const test = base.extend<{ account: FyleAccount }>({
  // eslint-disable-next-line no-empty-pattern
  account: async ({}, use) => {
    const account = await FyleAccount.create();
    await use(account);
    await account.delete();
  },
});
