import { test } from '../common/fixture';
import { expect } from '@playwright/test';
import { login } from '../common/setup/login';

test.describe('Integrations - Intacct', () => {

  test('Onboarding', async ({page, account}) => {
    // Navigate to intacct onboarding
    await login(page, account);
    await page.getByRole('button', { name: 'Integrations' }).click();

    // eslint-disable-next-line playwright/no-raw-locators
    const iframe = page.locator('#integrations_iframe').contentFrame();

    await iframe.getByText('Sage Intacct').click({timeout: 30_000});
    await expect(iframe.getByText('Guide to setup your')).toBeVisible();
    await iframe.getByRole('button', { name: 'Connect' }).click();


    // Connector
    await iframe.getByRole('textbox', { name: 'Enter company ID' }).fill(process.env.INTACCT_COMPANY_ID!);
    await iframe.getByRole('textbox', { name: 'Enter user ID' }).fill(process.env.INTACCT_USER_ID!);
    await iframe.getByRole('textbox', { name: 'Enter user password' }).fill(process.env.INTACCT_PASSWORD!);
    await iframe.getByRole('button', { name: 'Save and continue' }).click();

    await iframe.getByRole('combobox', { name: 'Select location entity' }).click();
    await iframe.getByRole('option', { name: 'Top Level' }).click();

    await iframe.getByRole('button', { name: 'Save and continue' }).click();
    await expect(iframe.getByRole('heading', { name: 'Export settings' })).toBeVisible({ timeout: 90_000 });
  });
});
