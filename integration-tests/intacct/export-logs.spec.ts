import { test } from "./org-setup-fixture";
import { expect } from "@playwright/test";

test('Export logs', async ({ iframeWithIntacctSetup: iframe, page }) => {
  await test.step('Zero state', async () => {
    // If there are no expense groups in the response, the export log should show a zero state
    await page.route(/.*expense_groups\/\?limit.*/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: `{
          "count": 0,
          "next": null,
          "previous": null,
          "results": []
        }`
      });
    });
    await iframe.getByRole('menuitem', { name: 'Export log' }).click();
    await expect(iframe.getByRole('heading', { name: 'No records to show yet!' })).toBeVisible();
    await page.unroute(/.*expense_groups\/\?limit.*/);
  });

  await test.step('Text filter', async () => {
    await iframe.getByRole('menuitem', { name: 'Dashboard' }).click();
    await iframe.getByRole('menuitem', { name: 'Export log' }).click();

    // Search by employee email
    await iframe.getByLabel('Search button').click();

    const expenseGroupReqPromise = page.waitForResponse(response =>
      response.url().includes('expense_groups/?') && response.status() === 200
    );
    await iframe.getByRole('textbox', { name: 'Search by employee name or' }).fill('employee0');

    // Wait for the search to complete
    await expenseGroupReqPromise;

    // Only the correct record should be shown
    await expect(iframe.getByRole('row', { name: 'E2E Employee' })).toHaveCount(1);
  });

  await test.step('Verify all fields are populated', async () => {
    // All cells in the row should be populated
    const row = iframe.getByRole('row', { name: 'E2E Employee' });
    const cells = iframe.getByRole('row', { name: 'E2E Employee' }).getByRole('cell');

    await expect(iframe.getByRole('row', { name: 'E2E Employee' }).getByRole('cell').first()).not.toBeEmpty();

    for (let i = 0; i < 5; i++) {
      await expect(cells.nth(i)).not.toBeEmpty();
    }

    // The expenses modal should open on clicking a record
    await row.getByRole('cell', { name: 'E2E' }).click();
    await expect(iframe.getByText('Expenses')).toBeVisible();

    // There should be 2 expenses in the expenses modal
    const expenses = iframe.getByLabel('Expenses').getByRole('row', { name: 'E/' });
    await expect(expenses).toHaveCount(2);

    // All fields should be populated
    const expenseCells = expenses.first().getByRole('cell');
    for (const cell of await expenseCells.all()) {
      await expect(cell).not.toBeEmpty();
    }
  });
});
