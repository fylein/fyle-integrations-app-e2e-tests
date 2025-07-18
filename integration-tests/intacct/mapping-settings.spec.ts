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
    rowSelector: 'E2E Category',
    sourceAttribute: 'E2E Category 5',
    sourceAttributeQuery: 'ry 5',
    destinationAttributes: ['E2E Account 10', 'E2E Account 1'],
    destinationAttributeQuery: 'count 10',
  },
  {
    testName: 'Corporate card mapping',
    sourceAttributeEndpoint: /.*expense_attributes\/\?limit.*/,
    mappingTab: 'Corporate card',
    countLabel: 'corporate cards',
    rowSelector: 'E2E Corporate Card',
    sourceAttribute: 'E2E Corporate Card 11',
    sourceAttributeQuery: 'rd 11',
    destinationAttributes: ['E2E Charge Card Number 10', 'E2E Charge Card Number 1'],
    destinationAttributeQuery: 'ber 10',
  },
  {
    testName: 'Project mapping',
    sourceAttributeEndpoint: /.*expense_attributes\/\?limit.*/,
    mappingTab: 'Custom Project',
    countLabel: 'custom projects',
    rowSelector: 'E2E Project',
    sourceAttribute: 'E2E Project 10',
    sourceAttributeQuery: '10',
    destinationAttributes: ['E2E Account 10', 'E2E Account 1'],
    destinationAttributeQuery: '10',
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
      await iframe.getByRole('searchbox').fill(destinationAttributeQuery);

      await expect(iframe.getByRole('option', { name: destinationAttributes[1], exact: true })).toBeHidden();
      await expect(iframe.getByRole('option', { name: destinationAttributes[0], exact: true })).toBeVisible();

      // Selecting an option should update the status and unmapped count
      const mappingPage = new MappingPage(iframe, countLabel);
      const unmappedEmployees = await mappingPage.getUnmappedCount();
      await expect(targetRow.getByText('UNMAPPED')).toBeVisible();

      await iframe.getByRole('option', { name: destinationAttributes[0], exact: true }).click();
      await expect(iframe.getByText('mapping saved successfully')).toBeVisible();

      const newUnmappedEmployees = await mappingPage.getUnmappedCount();
      expect(newUnmappedEmployees).toBe(unmappedEmployees - 1);
      await expect(targetRow.getByText('MAPPED', { exact: true })).toBeVisible();

      // The row should show the mapped option
      await expect(targetRow.getByText(destinationAttributes[0])).toBeVisible();
    });


    await test.step('Status filter', async () => {
      // When MAPPED is selected, only MAPPED records should be visible
      await iframe.getByRole('combobox', { name: 'Select status' }).click();
      await iframe.getByRole('option', { name: 'Mapped', exact: true }).click();
      await expect(iframe.getByText('MAPPED', { exact: true }).first()).toBeVisible();
      await expect(iframe.getByText('UNMAPPED', { exact: true }).first()).toBeHidden();

      // When UNMAPPED is selected, only UNMAPPED records should be visible
      await iframe.getByRole('combobox', { name: 'Mapped' }).click();
      await iframe.getByRole('option', { name: 'Unmapped', exact: true }).last().click();
      await expect(iframe.getByText('UNMAPPED', { exact: true }).first()).toBeVisible();
      await expect(iframe.getByText('MAPPED', { exact: true }).first()).toBeHidden();

      // When clear is clicked, both MAPPED and UNMAPPED records should be visible
      await iframe.getByRole('combobox', { name: 'Unmapped' }).getByRole('img').click();
      await expect(iframe.getByText('MAPPED', { exact: true }).first()).toBeVisible();
      await expect(iframe.getByText('UNMAPPED', { exact: true }).first()).toBeVisible();
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
      await iframe.getByRole('menuitem', { name: mappingTab }).click();

      await iframe.getByText('X', { exact: true }).click();
      await expect(iframe.getByText('No search result to show yet')).toBeVisible();
      await expect(iframe.getByRole('row', { name: rowSelector })).toBeHidden();

      await iframe.getByText(sourceAttribute.charAt(0).toUpperCase(), { exact: true }).click();
      await expect(iframe.getByRole('row', { name: rowSelector }).first()).toBeVisible();
    });
  });
});
