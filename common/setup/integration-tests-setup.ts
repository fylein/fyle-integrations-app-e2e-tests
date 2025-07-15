import { test as setup } from '@playwright/test';
import { FyleAccount } from '../services/fyle/fyle-account.service';
import { loginAndGoToIntegrations } from './login';

const authFile = 'playwright/.auth/user.json';
setup('Integration tests setup', async ({ page }) => {
  const account = await FyleAccount.create();

  process.env.INTEGRATION_TESTS_EMAIL = account.ownerEmail;
  process.env.INTEGRATION_TESTS_ORG_ID = account.orgId;

  await loginAndGoToIntegrations(page, account);
  await page.context().storageState({ path: authFile });
});

