import { test } from '../playwright/fixture';
import { expect, FrameLocator } from '@playwright/test';
import { loginAndGoToIntegrations } from '../common/setup/login';
import { waitForComboboxOptions } from '../common/utils/wait';
import { ReportsService } from '../common/services/fyle/reports.service';
import { IntacctService } from '../common/services/intacct.service';

test('Intacct E2E', async ({ page, account }) => {
  let iframe: FrameLocator;

  await test.step('Login and go to integrations', async () => {
    iframe = await loginAndGoToIntegrations(page, account);
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
      // await iframe.getByRole('textbox', { name: 'Enter user password' }).fill(process.env.INTACCT_PASSWORD!);
      // Use force click to bypass app-button wrapper intercepting pointer events
      await iframe.getByRole('button', { name: 'Save and continue' }).click({ force: true });

      await iframe.getByRole('combobox', { name: 'Select location entity' }).click();
      await iframe.getByRole('option', { name: 'Top Level' }).click();

      // Use force click to bypass app-button wrapper intercepting pointer events
      await iframe.getByRole('button', { name: 'Save and continue' }).click({ force: true });
    });

    await test.step('Export settings - reimbursable expenses', async () => {
      await expect(iframe.getByRole('heading', { name: 'Export settings' })).toBeVisible({ timeout: 90_000 });
      let glAccountCombobox = iframe.getByRole('combobox', { name: 'Select GL account' });

      // Wait for attributes to sync before filling out export settings
      // Once synced, the GL account combobox should have options
      await waitForComboboxOptions(page, iframe, glAccountCombobox, async () => {
        await iframe.getByRole('switch', { name: 'Export reimbursable expenses' }).click();
        await iframe.getByRole('combobox', { name: 'Select expense export module' }).click();
        await iframe.getByRole('option', { name: 'Journal entry' }).click();
      });

      // Re-acquire combobox in case page was reloaded during waitForComboboxOptions
      glAccountCombobox = iframe.getByRole('combobox', { name: 'Select GL account' });
      await glAccountCombobox.waitFor({ state: 'visible', timeout: 10_000 });
      await glAccountCombobox.click();
      await iframe.getByRole('option', { name: 'Accm.Depr. Furniture &' }).first().click();
      await iframe.getByRole('combobox', { name: 'Select representation' }).click();
      await iframe.getByRole('option', { name: 'Vendor' }).click();
      await iframe.getByText('Select mapping method').click();
      await iframe.getByRole('option', { name: 'Based on employee email ID' }).click();
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
      await iframe.getByRole('button', { name: 'Save and continue' }).click({ force: true });
    });


    await test.step('Import settings', async () => {
      await expect(iframe.getByRole('heading', { name: 'Import settings' })).toBeVisible();
      await iframe.getByRole('switch', { name: 'Import GL accounts as categories'}).click();
      await iframe.getByRole('combobox', { name: 'Choose Sage Exp Mgmt Expense field' }).first().click();
      await iframe.getByRole('option', { name: 'Cost center' }).click();

      const howToImportComboboxes = await iframe.getByRole('combobox', { name: 'Select how to import' }).all();
      for (const element of howToImportComboboxes.reverse()) {
        await element.click();
        await iframe.getByRole('option', { name: 'Import codes + names' }).first().click();
      }

      await iframe.getByRole('button', { name: 'Save and continue' }).click({ force: true });
    });

    await test.step('Advanced settings', async () => {
      await expect(iframe.getByRole('heading', { name: 'Advanced settings' })).toBeVisible();
      await iframe.getByRole('switch', { name: 'Auto-create vendor' }).click();
      await iframe.getByRole('button', { name: 'Save and continue' }).click({ force: true });
      await iframe.getByRole('button', { name: 'Launch integration' }).click({ force: true });
    });
  });

  await test.step('Dashboard', async () => {
    await test.step('No expense in queue', async () => {
      // Empty queue shows "Sit back and relax!"; otherwise dashboard may show Export or other state
      await expect(
        iframe.getByRole('heading', { name: 'Sit back and relax!' }).or(iframe.getByRole('button', { name: 'Export' })).or(iframe.getByRole('tab', { name: 'Dashboard' }))
      ).toBeVisible({ timeout: 30_000 });
    });

    await test.step('Create Sage Exp Mgmt reports', async () => {
      const reportsService = await ReportsService.init(account, {
        expensesAmount: { min: -100, max: 100 },
        expensesCount: 2,
      });

      // Create reimbursable expenses in processing state
      await reportsService.bulkCreate(1, 'processing');

      // Create CCC expenses in approved state
      await reportsService.createCCCReport('approved');
    });

    await test.step('Expense sync & failing real-time export', async (expenseSyncStep) => {
      expenseSyncStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev: skipping steps that require fresh org expense state');
      await page.reload();

      await expect(iframe.getByRole('heading', { name: /3 expenses? ready to export/ })).toBeVisible();
      await expect(iframe.getByRole('heading', { name: /0 new expenses?, 3 previously failed/ })).toBeVisible();
    });

    await test.step('Mapping error resolution', async (mappingStep) => {
      mappingStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev: skipping');
      await iframe.getByText('Resolve', { exact: true }).click();
      await expect(iframe.getByRole('cell', { name: 'Category in Sage Exp Mgmt' })).toBeVisible();

      const emptyAccountFields = await iframe.getByRole('combobox', { name: 'Select an option' }).all();
      for (const element of emptyAccountFields.reverse()) {
        await element.click();
        await iframe.getByRole('option', { name: 'Accm.Depr. Furniture &' }).first().click();
      }

      // Close the dialog
      await iframe.getByRole('dialog', { name: 'Category mapping errors' }).getByRole('button').first().click();
      await expect(iframe.getByText('Resolved', { exact: true })).toBeVisible();
    });

    await test.step('Sage Intacct errors should be reported', async (intacctErrorsStep) => {
      intacctErrorsStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev: skipping');
      await iframe.getByRole('button', { name: 'Export' }).click();
      await expect(iframe.getByText('Failed expenses 3 View')).toBeVisible();
      await expect(iframe.getByRole('heading', { name: 'Sage Intacct errors' })).toBeVisible();
    });

    await test.step('Sage Intacct error resolution', async (resolutionStep) => {
      resolutionStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev: skipping');
      await iframe.getByRole('menuitem', { name: 'Configuration' }).click();
      await iframe.getByRole('menuitem', { name: 'Advanced settings' }).click();
      await iframe.getByRole('combobox', { name: 'Select location' }).click();
      await iframe.getByRole('option', { name: 'BangaloreYoYo' }).click();
      await iframe.getByRole('button', { name: 'Save' }).click();
      await expect(iframe.getByText('Advanced settings saved')).toBeVisible();

      await iframe.getByRole('menuitem', { name: 'Dashboard' }).click();
    });

    await test.step('Export and assert success', async (exportStep) => {
      exportStep.skip(!!process.env.LOCAL_DEV_EMAIL, 'Local dev: skipping');
      await iframe.getByRole('button', { name: 'Export' }).click();
      await expect(iframe.getByRole('heading', { name: /Exporting [012] of 3 expenses?/ })).toBeVisible();
      await expect(iframe.getByRole('heading', { name: 'You are all caught up!' })).toBeVisible();
      await expect(iframe.getByText(/Successful expenses? 3/)).toBeVisible();
      await expect(iframe.getByText(/Failed expenses? 0/)).toBeVisible();

      // Store an exported CCC expense group to compare its details in export logs vs. Intacct
      let cccExpense: {seq_num: string, amount: number, recordno: string, category: string};

      await test.step('Export log', async () => {
        await page.route(/.*\/expense_groups\/\?.*/, async route => {
          const response = await route.fetch();
          const expenseGroups = (await response.json()).results;
          const cccExpenseGroup = expenseGroups.find((expenseGroup) => expenseGroup.fund_source === 'CCC');
          cccExpense = {
            seq_num: cccExpenseGroup?.expenses?.[0]?.expense_number,
            amount: cccExpenseGroup?.expenses?.[0]?.amount,
            // Store an intacct RECORDNO to later fetch the CCT from Intacct
            recordno: cccExpenseGroup?.response_logs?.key,
            category: cccExpenseGroup?.expenses?.[0]?.category,
          };

          await route.fulfill({ response });
        });

        const expenseGroupReqPromise = page.waitForResponse(response =>
          response.url().includes('expense_groups/?') && response.status() === 200
        );

        // Search by expense number of the saved CCC expense
        await iframe.getByRole('menuitem', { name: 'Export log' }).click();
        await iframe.getByLabel('Search button').click();
        await iframe.getByRole('textbox', { name: 'Search by employee name or' }).fill(cccExpense.seq_num!);

        // Wait for search to complete
        await expenseGroupReqPromise;

        // Open the expenses group dialog
        await iframe.getByRole('cell', { name: 'Corporate card' }).first().click();
        await expect(iframe.getByRole('cell', { name: 'Expense ID' })).toBeVisible();

        // There must be 1 expense in the CCC expense group
        const expensesLocator = iframe.getByLabel('Expenses').getByRole('row', { name: 'E/' });
        await expect(expensesLocator).toHaveCount(1);

        // The Expense ID, Category, and Amount fields must be displayed
        const cellsLocator = expensesLocator.first().getByRole('cell');
        await expect(cellsLocator.first()).toContainText(cccExpense.seq_num!);
        await expect(cellsLocator.nth(2)).toContainText(cccExpense.category!);
        await expect(cellsLocator.nth(3)).toContainText(cccExpense.amount!.toString());
      });

      await test.step('Verify exported fields in Intacct', async () => {
        const cct = await IntacctService.getCCTByInternalId(account.orgId, cccExpense.recordno!);
        expect(cct.RECORDID).toEqual(cccExpense.seq_num);
        expect(cct.TRX_TOTALENTERED).toEqual(cccExpense.amount.toString());
        expect((cct.DESCRIPTION as string).includes(account.ownerEmail)).toBe(true);
      });
    });
  });
});
