import { test } from '../common/fixture';
import { expect, FrameLocator } from '@playwright/test';
import { login } from '../common/setup/login';
import { waitForComboboxOptions } from '../common/utils/wait';
import { ReportsService } from '../common/setup/reports.service';

test('Intacct E2E', async ({ page, account }) => {
  let iframe: FrameLocator;

  // Store the created report number to verify the export log
  let reimbursableReport: {seq_num: string};

  await test.step('Login and go to integrations', async () => {
    await login(page, account);


    // eslint-disable-next-line playwright/no-conditional-in-test
    if (await page.getByRole('button', { name: 'Next' }).isVisible({timeout: 500})) {
      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('button', { name: 'Let\'s start' }).click();
    }
    await page.getByRole('button', { name: 'Integrations' }).click();

    // eslint-disable-next-line playwright/no-raw-locators
    iframe = page.locator('#integrations_iframe').contentFrame();
  });

  await test.step('Onboarding', async (onboardingStep) => {
    onboardingStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev email detected, skipping onboarding');

    await test.step('Navigate to intacct onboarding', async () => {
      await iframe.getByText('Sage Intacct').click();
      await expect(iframe.getByText('Guide to setup your')).toBeVisible();
      await iframe.getByRole('button', { name: 'Connect' }).click();
    });

    await test.step('Connector', async () => {
      await iframe.getByRole('textbox', { name: 'Enter company ID' }).fill(process.env.INTACCT_COMPANY_ID!);
      await iframe.getByRole('textbox', { name: 'Enter user ID' }).fill(process.env.INTACCT_USER_ID!);
      await iframe.getByRole('textbox', { name: 'Enter user password' }).fill(process.env.INTACCT_PASSWORD!);
      await iframe.getByRole('button', { name: 'Save and continue' }).click();

      await iframe.getByRole('combobox', { name: 'Select location entity' }).click();
      await iframe.getByRole('option', { name: 'Top Level' }).click();

      await iframe.getByRole('button', { name: 'Save and continue' }).click();
    });

    await test.step('Export settings - reimbursable expenses', async () => {
      await expect(iframe.getByRole('heading', { name: 'Export settings' })).toBeVisible({ timeout: 90_000 });
      const glAccountCombobox = iframe.getByRole('combobox', { name: 'Select GL account' });

      // Wait for attributes to sync before filling out export settings
      // Once synced, the GL account combobox should have options
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
    });

    await test.step('Export settings - CCC', async () => {
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
    });


    await test.step('Import settings', async () => {
      await expect(iframe.getByRole('heading', { name: 'Import settings' })).toBeVisible();
      await iframe.getByRole('switch', { name: 'Import GL accounts as categories'}).click();
      await iframe.getByRole('combobox', { name: 'Choose Fyle Expense field' }).first().click();
      await iframe.getByRole('option', { name: 'Cost center' }).click();

      const howToImportComboboxes = await iframe.getByRole('combobox', { name: 'Select how to import' }).all();
      for (const element of howToImportComboboxes.reverse()) {
        await element.click();
        await iframe.getByRole('option', { name: 'Import codes + names' }).first().click();
      }

      await iframe.getByRole('button', { name: 'Save and continue' }).click();
    });

    await test.step('Advanced settings', async () => {
      await expect(iframe.getByRole('heading', { name: 'Advanced settings' })).toBeVisible();

      // TODO: Remove this once real time export is stable
      await iframe.getByRole('switch', { name: 'Schedule automatic export' }).click();

      await iframe.getByRole('switch', { name: 'Auto-create vendor' }).click();
      await iframe.getByRole('combobox', { name: 'Select location' }).click();
      await iframe.getByRole('option', { name: 'BangaloreYoYo' }).click();
      await iframe.getByRole('combobox', { name: 'Select project' }).click(); // Selecting a project to trigger an intacct-side error
      await iframe.getByRole('option', { name: 'A Project New' }).click();
      await iframe.getByRole('button', { name: 'Save and continue' }).click();
      await iframe.getByRole('button', { name: 'Launch integration' }).click();
    });
  });

  await test.step('Dashboard', async () => {
    await test.step('No expense in queue', async () => {
      await expect(iframe.getByRole('heading', { name: 'Sit back and relax!' })).toBeVisible();
    });

    await test.step('Create Fyle reports', async () => {
      const reportsService = await ReportsService.init(account, {
        expensesAmount: { min: -100, max: 100 },
        expensesCount: 2,
      });

      // Create reimbursable expenses in processing state
      reimbursableReport = (await reportsService.bulkCreate(1, 'processing'))[0];

      // Create CCC expenses in approved state
      await reportsService.createCCCReport('approved');
    });

    await test.step('Expense sync & failing real-time export', async () => {
      await page.reload();

      // TODO: Uncomment this once real time export is stable
      // await expect.soft(iframe.getByRole('heading', { name: /Exporting [012] of [1-3] expenses?/ })).toBeVisible({timeout: 5000});

      // TODO: Remove manual export once real time export is stable
      await iframe.getByRole('button', { name: 'Export' }).click();


      await expect(iframe.getByRole('heading', { name: /[1-3] expenses? ready to export/ })).toBeVisible();
      await expect(iframe.getByRole('heading', { name: /[0-3] new expenses?, [1-3] previously failed/ })).toBeVisible();
    });

    await test.step('Error resolution', async () => {
      await iframe.getByText('Resolve', { exact: true }).click();
      await expect(iframe.getByRole('cell', { name: 'Category in Fyle' })).toBeVisible();

      const emptyAccountFields = await iframe.getByRole('combobox', { name: 'Select an option' }).all();
      for (const element of emptyAccountFields.reverse()) {
        await element.click();
        await iframe.getByRole('option', { name: 'Accm.Depr. Furniture &' }).first().click();
      }

      // Close the dialog
      await iframe.getByRole('dialog', { name: 'Category mapping errors' }).getByRole('button').first().click();
      await expect(iframe.getByText('Resolved', { exact: true })).toBeVisible();
    });

    await test.step('Export and assert success', async () => {
      await iframe.getByRole('button', { name: 'Export' }).click();
      await expect(iframe.getByRole('heading', { name: /Exporting [012] of [1-3] expenses?/ })).toBeVisible();
      await expect(iframe.getByRole('heading', { name: 'You are all caught up!' })).toBeVisible();
      await expect(iframe.getByText(/Successful expenses? [1-3]/)).toBeVisible();
      await expect(iframe.getByText(/Failed expenses? 0/)).toBeVisible();

      await test.step('Export log', async () => {
        await iframe.getByRole('menuitem', { name: 'Export log' }).click();
        await iframe.locator('app-search span').click();
        await iframe.getByRole('textbox', { name: 'Search by employee name or' }).fill(reimbursableReport.seq_num);

        await iframe.getByRole('cell', { name: 'Reimbursable' }).click();
        await expect(iframe.getByRole('cell', { name: 'Expense ID' })).toBeVisible();

        // There must be 2 expenses in the report
        const expensesLocator = iframe.getByRole('row', { name: /E\/\d+\/\d+\/T\// });
        await expect(expensesLocator).toHaveCount(2);

        // The Expense ID, Category, and Amount fields must be populated
        const cellsLocator = expensesLocator.first().getByRole('cell');
        await expect(cellsLocator.first()).toContainText(/E\/\d+\/\d+\/T\//);
        await expect(cellsLocator.nth(2)).toContainText(/\w+/);
        await expect(cellsLocator.nth(3)).toContainText(/\d+/);
      });
    });
  });
});
