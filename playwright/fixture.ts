import { test as base } from '@playwright/test';
import { FyleAccount } from '../common/services/fyle/fyle-account.service';

// Extend basic test fixture with our custom fixture
export const test = base.extend<{ account: FyleAccount | undefined }>({
  account: async ({}, use, testInfo) => {
    let account: FyleAccount | undefined;
    try {
      account = await FyleAccount.create();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      testInfo.skip(true, `Account creation failed (run without LOCAL_DEV_EMAIL requires working signup): ${message}`);
      await use(undefined);
      return;
    }
    await use(account);
    await account.delete();
  },
});
