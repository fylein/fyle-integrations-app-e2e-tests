import { expect } from "@playwright/test";
import { test } from "../org-setup-fixture";
import { waitFor } from "../../../common/utils/wait";


test('Advanced settings', async ({ iframeWithIntacctSetup: iframe, page }) => {
  await iframe.getByRole('menuitem', { name: 'Configuration' }).click();
  await iframe.getByRole('menuitem', { name: 'Advanced settings' }).click();

  // Collapse sidebar to avoid flakiness caused by small screen not being able to fit date selector
  await page.getByRole('button', { name: 'Collapse sidebar' }).click();

  await test.step('Schedule automatic export', async () => {
    await iframe.getByRole('switch', { name: 'Schedule automatic export' }).click();
    await expect(iframe.getByText('Real-time')).toBeVisible();

    await iframe.getByText('Add new email address').click();
    await iframe.getByRole('textbox', { name: 'Enter name' }).fill('E2E Test Name');
    await iframe.getByRole('textbox', { name: 'Enter email' }).fill('email@e2etest.com');
    await iframe.getByRole('button', { name: 'Add and save' }).click();
    await expect(iframe.getByText('Email address saved')).toBeVisible();
  });


  await test.step('Set other preferences', async () => {
    await iframe.getByRole('switch', { name: 'Post entries in the current' }).click();
    await iframe.getByRole('switch', { name: 'Auto-create vendor' }).click();

    // Add fields to top memo
    await iframe.getByText('Select top memo').click();
    await iframe.getByRole('option', { name: 'employee_email' }).click();
    await iframe.getByRole('option', { name: 'report_number' }).click();

    // Add and remove fields from line-item level memo
    await iframe.getByText('Employee email, Category, Spent on').click();
    await iframe.getByRole('option', { name: 'employee_email' }).last().click();
    await iframe.getByRole('option', { name: 'report_number' }).last().click();
    await iframe.getByRole('option', { name: 'spent_on' }).last().click();
    await iframe.getByRole('option', { name: 'category' }).last().click();
    await iframe.getByRole('option', { name: 'card_number' }).last().click();
  });

  await test.step('Set skip expenses', async () => {
    await iframe.getByRole('switch', { name: 'Skip selective expenses from' }).click();

    await iframe.getByRole('combobox', { name: 'Select condition' }).click();
    await iframe.getByText('Claim number').click();
    await iframe.getByRole('combobox', { name: 'Select operator' }).click();
    await iframe.getByRole('option', { name: 'is' }).click();
    await iframe.getByRole('textbox').fill('C/2025/01/R/1');
    await iframe.getByRole('textbox').press('Enter');
    await iframe.getByRole('textbox').fill('C/2025/01/R/2');
    await iframe.getByRole('textbox').press('Enter');
    await iframe.getByRole('textbox').fill('C/2025/01/R/3');
    await iframe.getByRole('textbox').press('Enter');

    await iframe.getByText('Add more fields').click();
    await iframe.getByRole('combobox', { name: 'Join by' }).click();
    await iframe.getByRole('option', { name: 'AND' }).click();

    await iframe.getByRole('combobox', { name: 'Select condition' }).click();
    await iframe.getByText('Spent at').click();
    await iframe.getByRole('combobox', { name: 'Select operator' }).click();
    await waitFor(200);
    await iframe.getByRole('option', { name: 'is on or before' }).click();
    await iframe.getByRole('combobox', { name: 'Select date' }).click();
    await iframe.getByRole('gridcell', { name: '16' }).click();
    await iframe.getByRole('gridcell', { name: '16' }).waitFor({ state: 'hidden' });
  });

  await test.step('Set default values', async () => {
    await iframe.getByRole('combobox', { name: 'Select location' }).click();
    await iframe.getByRole('option', { name: 'E2E Location 1', exact: true }).click();
    // eslint-disable-next-line playwright/no-raw-locators
    await iframe.locator('span').filter({ hasText: 'Use employee\'s location in' }).getByRole('checkbox').check();


    await iframe.getByRole('combobox', { name: 'Select department' }).click();
    await iframe.getByRole('option', { name: 'E2E Department 1', exact: true }).click();
    // eslint-disable-next-line playwright/no-raw-locators
    await iframe.locator('span').filter({ hasText: 'Use employee\'s department in' }).getByRole('checkbox').check();
  });

  await test.step('Save and assert persistence', async () => {
    await iframe.getByRole('button', { name: 'Save' }).click();
    await expect(iframe.getByText('Advanced settings saved')).toBeVisible();

    await iframe.getByRole('menuitem', { name: 'Export settings' }).click();
    await iframe.getByRole('menuitem', { name: 'Advanced settings' }).click();

    await expect(iframe.getByRole('switch', { name: 'Schedule automatic export' }).getByRole('switch')).toBeChecked();
    await expect(iframe.getByText('email@e2etest.com')).toBeVisible();
    await expect(iframe.getByRole('switch', { name: 'Post entries in the current' }).getByRole('switch')).not.toBeChecked();
    await expect(iframe.getByRole('switch', { name: 'Auto-create vendor' }).getByRole('switch')).not.toBeChecked();
    await expect(iframe.getByRole('switch', { name: 'Skip selective expenses from' }).getByRole('switch')).toBeChecked();

    const texts = [
      'Employee email, Report number',
      'Purpose, Expense link, Card number',
      'C/2025/01/R/1',
      'C/2025/01/R/2',
      'C/2025/01/R/3',
      'E2E Location 1',
      'E2E Department 1',
    ];
    for (const text of texts) {
      await expect(iframe.getByText(text)).toBeVisible();
    }

    await expect(iframe.getByRole('combobox', { name: 'Select date' })).toHaveValue(/.*\/15\/.*/);
  });
});
