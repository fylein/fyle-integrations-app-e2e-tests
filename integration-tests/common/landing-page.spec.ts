import { expect, test } from '@playwright/test';
import { goToIntegrations } from '../../common/setup/login';
import { FyleAccount } from '../../common/services/fyle/fyle-account.service';

test.describe.configure({ mode: 'parallel' });

[
  {
    integration: 'Netsuite',
    onboardingText: 'Import data from NetSuite to',
  },
  {
    integration: 'Intacct',
    onboardingText: 'Import data from Sage Intacct',
  },
  {
    integration: 'QuickBooks Online',
    onboardingText: 'Import data from QuickBooks Online',
  },
  {
    integration: 'Xero',
    onboardingText: 'Import data from Xero to Fyle',
  },
  {
    integration: 'QuickBooks Desktop (Web Connector)',
    onboardingText: 'Import data from QuickBooks Desktop',
  },
  {
    integration: 'Sage 300',
    onboardingText: 'Import data from Sage 300 CRE',
  },
  {
    integration: 'BambooHR',
    onboardingText: 'Auto sync employee details between Bamboo HR',
  },
  {
    integration: 'TravelPerk',
    onboardingText: 'TravelPerk invoices as credit',
  }
].forEach(({ integration, onboardingText }) => {
  test.skip(`Navigate to ${integration}`, async ({ page }) => {
    const account = new FyleAccount(process.env.INTEGRATION_TESTS_EMAIL!);
    const iframe = await goToIntegrations(page, account);
    await iframe.getByText(integration).click();
    await expect(iframe.getByText(onboardingText)).toBeVisible();
  });
});
