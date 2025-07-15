import { test } from "./org-setup-fixture";
import { expect } from "@playwright/test";
import { MappingPage } from "../../common/pom/mapping-page";
import { PaginatedPage } from "../../common/pom/paginated-page";

test('Mapping settings', async ({ iframeWithIntacctSetup: iframe, page }) => {
  await test.step('Zero state', async () => {
    await page.route(/.*employee_attributes\/\?limit.*/, async (route) => {
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
    await iframe.getByRole('menuitem', { name: 'Mapping' }).click();
    await expect(iframe.getByRole('heading', { name: 'No search result to show yet!' })).toBeVisible();
    await page.unroute(/.*employee_attributes\/\?limit.*/);
  });


  await test.step('Mapping page header', async () => {
    await iframe.getByRole('menuitem', { name: 'Dashboard' }).click();
    await iframe.getByRole('menuitem', { name: 'Mapping' }).click();
    const mappingPage = new MappingPage(iframe, 'employees');

    const unmappedEmployees = await mappingPage.getUnmappedCount();
    const totalEmployees = await mappingPage.getTotalCount();

    // Assert that the numbers make sense
    expect(unmappedEmployees).toBeGreaterThanOrEqual(0);
    expect(totalEmployees).toBeGreaterThanOrEqual(0);
    expect(unmappedEmployees).toBeLessThanOrEqual(totalEmployees);
  });


  await test.step('Text filter', async () => {
    // Invalid search
    await iframe.getByLabel('Search button').click();

    let searchResponse = page.waitForResponse(/.*employee_attributes\/.*/);
    await iframe.getByRole('textbox', { name: 'Search' }).fill('Invalid search');
    await searchResponse;

    await expect(iframe.getByRole('row', { name: 'E2E Employee' })).toBeHidden();

    // Valid search
    await iframe.getByLabel('Search button').click();

    searchResponse = page.waitForResponse(/.*employee_attributes\/.*/);
    await iframe.getByRole('textbox', { name: 'Search' }).fill('E2E Emp');
    await searchResponse;

    await expect(iframe.getByRole('row', { name: 'E2E Employee' }).first()).toBeVisible();
    const count = await iframe.getByRole('row', { name: 'E2E Employee' }).count();
    expect(count).toBeGreaterThanOrEqual(10);
  });


  await test.step('Alphabet filter', async () => {
    await iframe.getByText('X', { exact: true }).click();
    await expect(iframe.getByRole('row', { name: 'E2E Employee' })).toBeHidden();

    await iframe.getByText('E', { exact: true }).click();
    await expect(iframe.getByRole('row', { name: 'E2E Employee' }).first()).toBeVisible();
    const count = await iframe.getByRole('row', { name: 'E2E Employee' }).count();
    expect(count).toBeGreaterThanOrEqual(10);
  });


  await test.step('Verify pagination', async () => {
    const paginatedPage = new PaginatedPage(iframe, 'E2E Employee');
    await paginatedPage.verifyPagination();
  });
});
