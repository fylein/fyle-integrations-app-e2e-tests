import { test } from "./org-setup-fixture";
import { expect } from "@playwright/test";
import { MappingPage } from "../../common/pom/mapping-page";
import { PaginatedPage } from "../../common/pom/paginated-page";

[
  {
    testName: 'Employee mapping',
    sourceAttributeEndpoint: /.*employee_attributes\/\?limit.*/,
    mappingTab: 'Employee',
    countLabel: 'employees',
    rowSelector: 'E2E Employee',
    sourceAttribute: 'E2E Employee 10',
    sourceAttributeQuery: 'e2e emp',
    destinationAttributes: ['E2E Vendor 10', 'E2E Vendor 1'],
    destinationAttributeQuery: 'vendor 10',
  },
  {
    testName: 'Category mapping',
    sourceAttributeEndpoint: /.*category_attributes\/\?limit.*/,
    mappingTab: 'Category',
    countLabel: 'categories',
    rowSelector: /Airlines|Bus|Entertainment|Food|Fuel|Groceries|Lodging|Mail|Mileage|Office Supplies|Others|Parking|Per Diem|Professional Services|Rental|Software|Taxi|Train|Unspecified|Utility/,
    sourceAttribute: 'Groceries',
    sourceAttributeQuery: 'oceri',
    destinationAttributes: ['E2E Account 10', 'E2E Account 1'],
    destinationAttributeQuery: 'count 10',
  },
].forEach(({ testName, sourceAttributeEndpoint, mappingTab, countLabel, rowSelector, sourceAttribute, sourceAttributeQuery, destinationAttributes, destinationAttributeQuery }) => {
  test(testName, async ({ iframeWithIntacctSetup: iframe, page }) => {
    await test.step('Zero state', async () => {
      await page.route(sourceAttributeEndpoint, async (route) => {
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
      await iframe.getByRole('menuitem', { name: mappingTab }).click();

      await expect(iframe.getByRole('heading', { name: 'No search result to show yet!' })).toBeVisible();
      await page.unroute(sourceAttributeEndpoint);
    });


    await test.step('Mapping page header', async () => {
      await iframe.getByRole('menuitem', { name: 'Dashboard' }).click();
      await iframe.getByRole('menuitem', { name: 'Mapping' }).click();
      await iframe.getByRole('menuitem', { name: mappingTab }).click();

      const mappingPage = new MappingPage(iframe, countLabel);
      const unmappedEmployees = await mappingPage.getUnmappedCount();
      const totalEmployees = await mappingPage.getTotalCount();

      // Assert that the numbers make sense
      expect(unmappedEmployees).toBeGreaterThanOrEqual(0);
      expect(totalEmployees).toBeGreaterThanOrEqual(0);
      expect(unmappedEmployees).toBeLessThanOrEqual(totalEmployees);
    });


    await test.step('Setting a mapping', async () => {
      const targetRow = iframe.getByRole('row', { name: sourceAttribute });

      // Options should show on dropdown click
      await targetRow.getByLabel('Select an option').click();
      await expect(iframe.getByRole('option', { name: destinationAttributes[1], exact: true })).toBeVisible();

      // Advanced search should filter options correctly
      const searchResponse = page.waitForResponse(/.*paginated_destination_attributes.*/);
      await iframe.getByRole('searchbox').fill(destinationAttributeQuery);
      await searchResponse;

      await expect(iframe.getByRole('option', { name: destinationAttributes[1], exact: true })).toBeHidden();
      await expect(iframe.getByRole('option', { name: destinationAttributes[0], exact: true })).toBeVisible();

      // Selecting an option should update the status and unmapped count
      const mappingPage = new MappingPage(iframe, countLabel);
      const unmappedEmployees = await mappingPage.getUnmappedCount();
      await expect(targetRow.getByText('UNMAPPED')).toBeVisible();

      await iframe.getByRole('option', { name: destinationAttributes[0], exact: true }).click();
      await expect(iframe.getByText(`${mappingTab} mapping saved`)).toBeVisible();

      const newUnmappedEmployees = await mappingPage.getUnmappedCount();
      expect(newUnmappedEmployees).toBe(unmappedEmployees - 1);
      await expect(targetRow.getByText('MAPPED', { exact: true })).toBeVisible();

      // The row should show the mapped option
      await expect(targetRow.getByText(destinationAttributes[0])).toBeVisible();
    });


    await test.step('Verify pagination', async () => {
      const paginatedPage = new PaginatedPage(iframe, rowSelector);
      await paginatedPage.verifyPagination();
    });


    await test.step('Text filter', async () => {
      // Invalid search
      await iframe.getByLabel('Search button').click();

      let searchResponse = page.waitForResponse(sourceAttributeEndpoint);
      await iframe.getByRole('textbox', { name: 'Search' }).fill('Invalid search');
      await searchResponse;

      await expect(iframe.getByRole('row', { name: rowSelector })).toBeHidden();
      await expect(iframe.getByRole('heading', { name: 'No search result to show yet!' })).toBeVisible();

      // Valid search
      await iframe.getByLabel('Search button').click();

      searchResponse = page.waitForResponse(sourceAttributeEndpoint);
      await iframe.getByRole('textbox', { name: 'Search' }).fill(sourceAttributeQuery);
      await searchResponse;

      await expect(iframe.getByRole('row', { name: rowSelector }).first()).toBeVisible();

      // Clear filter
      await iframe.getByLabel('Search button').getByRole('img').last().click();
    });


    await test.step('Alphabet filter', async () => {
      await iframe.getByText('X', { exact: true }).click();
      await expect(iframe.getByRole('row', { name: rowSelector })).toBeHidden();

      await iframe.getByText(sourceAttribute.charAt(0).toUpperCase(), { exact: true }).click();
      await expect(iframe.getByRole('row', { name: rowSelector }).first()).toBeVisible();
    });
  });
});
