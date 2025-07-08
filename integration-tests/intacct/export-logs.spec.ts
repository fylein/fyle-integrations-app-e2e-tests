import { test } from "./org-setup-fixture";
import { expect } from "@playwright/test";

test.describe('Export logs', () => {
  test('Zero state', async ({ iframeWithIntacctSetup: iframe, page }) => {
    // If no expense groups are found, the export log should show a zero state
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
  });
});
