import { test as setup } from '@playwright/test';
import { FyleAccount } from '../services/fyle/fyle-account.service';
import { loginAndGoToIntegrations } from './login';

const authFile = 'playwright/.auth/user.json';
setup('Integration tests setup', async ({ page }) => {
  const account = await FyleAccount.create();
  await loginAndGoToIntegrations(page, account);
  await page.context().storageState({ path: authFile });

  process.env.INTEGRATION_TESTS_EMAIL = account.ownerEmail;
});

