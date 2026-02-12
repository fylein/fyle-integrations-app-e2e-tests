import { expect } from "@playwright/test";
import { test } from "../org-setup-fixture";

test('Export settings', async ({ iframeWithIntacctSetup: iframe }) => {
  if (!iframe) return;
  await test.step('Test destination option search - reimbursable', async () => {
    await iframe.getByRole('menuitem', { name: 'Configuration' }).click();

    await test.step('Expense report module', async () => {
      await iframe.getByRole('combobox', { name: 'Bill' }).click();
      await iframe.getByRole('option', { name: 'Expense report' }).click();
      await iframe.getByRole('combobox', { name: 'Select expense payment type' }).click();
      await iframe.getByRole('searchbox').first().fill('49');
      await iframe.getByRole('option', { name: 'E2E Reimbursable Payment Type 49' }).click();
    });

    await test.step('Journal entry module', async () => {
      await iframe.getByRole('combobox', { name: 'Expense report' }).click();
      await iframe.getByRole('option', { name: 'Journal entry' }).click();
      await iframe.getByRole('combobox', { name: 'Select GL account' }).click();
      await iframe.getByRole('searchbox').first().fill('99');
      await iframe.getByRole('option', { name: 'E2E Account 99' }).click();
    });
  });

  await test.step('Test destination option search - CCC', async () => {
    await test.step('Charge card transaction module', async () => {
      // This module is selected by default for e2e orgs
      await expect(iframe.getByText('Charge card transaction', { exact: true })).toBeVisible();
      await iframe.getByText('Select corporate charge card').click();
      await iframe.getByRole('searchbox').first().fill('99');
      await iframe.getByRole('option', { name: 'E2E Charge Card Number 99' }).click();
    });

    await test.step('Bill module', async () => {
      await iframe.getByRole('combobox', { name: 'Charge card transaction' }).click();
      await iframe.getByRole('option', { name: 'Bill' }).click();
      await iframe.getByRole('combobox', { name: 'Select credit card vendor' }).click();
      await iframe.getByRole('searchbox').first().fill('99');
      await iframe.getByRole('option', { name: 'E2E Vendor 99' }).click();
    });

    await test.step('Journal entry module', async () => {
      await iframe.getByRole('combobox', { name: 'Bill' }).click();
      await iframe.getByRole('option', { name: 'Journal entry' }).click();
      await iframe.getByRole('combobox', { name: 'Select GL account' }).click();
      await iframe.getByRole('searchbox').first().fill('99');
      await iframe.getByRole('option', { name: 'E2E Account 99' }).click();
    });

    await test.step('Expense report module', async () => {
      await iframe.getByRole('combobox', { name: 'Journal entry' }).last().click();
      await iframe.getByRole('option', { name: 'Expense report' }).click();
      await iframe.getByRole('combobox', { name: 'Select expense payment type' }).click();
      await iframe.getByRole('searchbox').first().fill('49');
      await iframe.getByRole('option', { name: 'E2E CCC Payment Type 49' }).click();
    });
  });

  await test.step('Warning should be shown', async () => {
    await iframe.getByRole('button', { name: 'Save' }).click();

    await expect(iframe.getByText('Change in configuration')).toBeVisible();
    await expect(iframe.getByText('Bill to Journal entry')).toBeVisible();
    await expect(iframe.getByText('would impact a few configurations in the advanced settings')).toBeVisible();
  });

  await test.step('Changed settings should persist', async () => {
    await iframe.getByRole('button', { name: 'Continue' }).click();
    await expect(iframe.getByText('Export settings saved')).toBeVisible();
    await iframe.getByRole('menuitem', { name: 'Export settings' }).click();

    // Assert that all the changes persist
    await expect(iframe.getByText('Journal entry', { exact: true })).toBeVisible();
    await expect(iframe.getByText('E2E Account 99')).toBeVisible();
    await expect(iframe.getByText('Expense report', { exact: true })).toBeVisible();
    await expect(iframe.getByText('E2E CCC Payment Type 49')).toBeVisible();
  });
});
