import { test } from '../common/fixture';
import { expect } from '@playwright/test';
import { login } from '../common/setup/login';
import { waitForComboboxOptions } from '../common/utils/wait';

test.describe('Integrations - Intacct', () => {

  test('Onboarding', async ({page, account}) => {
    // Navigate to intacct onboarding
    await login(page, account);
    await page.getByRole('button', { name: 'Integrations' }).click();

    // eslint-disable-next-line playwright/no-raw-locators
    const iframe = page.locator('#integrations_iframe').contentFrame();

    await iframe.getByText('Sage Intacct').click();
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

    // Export settings - reimbursable expenses
    await expect(iframe.getByRole('heading', { name: 'Export settings' })).toBeVisible({ timeout: 90_000 });
    const glAccountCombobox = iframe.getByRole('combobox', { name: 'Select GL account' });

    // Wait for attributes to sync before filling out export settings
    // Once synced, the GL account combobox should have
    await waitForComboboxOptions(page, iframe, glAccountCombobox, async () => {
      await iframe.getByRole('switch', { name: 'Export reimbursable expenses' }).click();
      await iframe.getByRole('combobox', { name: 'Select expense export module' }).click();
      await iframe.getByRole('option', { name: 'Journal entry' }).click();
    });

    await glAccountCombobox.click();
    await iframe.getByRole('option', { name: 'Accm.Depr. Furniture &' }).first().click();
    await iframe.getByRole('combobox', { name: 'Select representation' }).click();
    await iframe.getByRole('option', { name: 'Vendor' }).click();
    await iframe.getByText('Select mapping method').click();
    await iframe.getByRole('option', { name: 'Based on employee e-mail ID' }).click();

    // Export settings - CCC
    await iframe.getByRole('switch', { name: 'Export corporate card' }).click();
    await iframe.getByRole('combobox', { name: 'Select expense export module' }).click();
    await iframe.getByRole('option', { name: 'Charge card transaction' }).click();
    await iframe.getByText('Select corporate charge card').click();
    await iframe.getByRole('option', { name: 'cccid' }).click();

    await iframe.getByRole('combobox', { name: 'Closed' }).click();
    await iframe.getByRole('option', { name: 'Approved' }).click();
    await iframe.getByRole('combobox', { name: 'Export date' }).nth(1).click();
    await iframe.getByRole('option', { name: 'Card transaction post date' }).click();
    await iframe.getByRole('button', { name: 'Save and continue' }).click();

    // Import settings
    await expect(iframe.getByRole('heading', { name: 'Import settings' })).toBeVisible();
    await iframe.getByRole('switch', { name: 'Import GL accounts as categories'}).click();
    await iframe.getByRole('combobox', { name: 'Choose Fyle Expense field' }).first().click();
    await iframe.getByRole('option', { name: 'Cost center' }).click();

    const howToImportComboboxes = await iframe.getByRole('combobox', { name: 'Select how to import' }).all();
    console.log(howToImportComboboxes);

    for (const element of howToImportComboboxes.reverse()) {
      console.log(element);
      await element.click();
      console.log('clicked');
      await iframe.getByRole('option', { name: 'Import codes + names' }).first().click();
    }


    await iframe.getByRole('button', { name: 'Save and continue' }).click();

    // Advanced settings
    await expect(iframe.getByRole('heading', { name: 'Advanced settings' })).toBeVisible();
    await iframe.getByRole('switch', { name: 'Auto-create vendor' }).click();
    await iframe.getByRole('combobox', { name: 'Select location' }).click();
    await iframe.getByRole('option', { name: 'BangaloreYoYo' }).click();
    await iframe.getByRole('combobox', { name: 'Select project' }).click(); // Selecting a project to trigger an intacct-side error
    await iframe.getByRole('option', { name: 'A Project New' }).click();
    await iframe.getByRole('button', { name: 'Save and continue' }).click();
    await iframe.getByRole('button', { name: 'Launch integration' }).click();

    await expect(iframe.getByRole('heading', { name: 'Sit back and relax!' })).toBeVisible();
  });
});
