import { expect } from "@playwright/test";
import { test } from "../org-setup-fixture";

test.use({ useRealIntacctCreds: true });

test('Import settings', async ({ iframeWithIntacctSetup: iframe }) => {
  await iframe.getByRole('menuitem', { name: 'Configuration' }).click();
  await iframe.getByRole('menuitem', { name: 'Import settings' }).click();

  await test.step('Toggle category and merchant imports', async () => {
    await iframe.getByLabel('Import GL accounts as categories').click(); // Turn on account -> category mapping
    await iframe.getByLabel('Import vendor as merchant').click(); // Turn off vendor -> merchant mapping
  });

  await test.step('Map all remaining intacct fields', async () => {
    // Map the first field (location) to cost center
    await iframe.getByRole('combobox', { name: 'Choose Fyle Expense field' }).first().click();
    await iframe.getByRole('option', { name: 'Cost Center' }).click();

    // Map the second field (department) to a new custom field
    await iframe.getByRole('combobox', { name: 'Choose Fyle Expense field' }).first().click();
    await iframe.getByRole('option', { name: 'Create a custom field' }).click();
    await iframe.getByRole('textbox', { name: 'Enter field type' }).fill('E2E Custom Field');
    await iframe.getByRole('textbox', { name: 'Enter field name' }).click();
    await iframe.getByRole('textbox', { name: 'Enter field name' }).fill('Custom field placeholder');
    await iframe.getByRole('button', { name: 'Create and save' }).click();

    // Map the third field (project) to project
    await iframe.getByRole('combobox', { name: 'Choose Fyle Expense field' }).first().click();
    await iframe.getByRole('option', { name: 'Custom Project' }).click();

    // Enable code imports
    await iframe.getByRole('combobox', { name: 'Select how to import account' }).click();
    await iframe.getByRole('option', { name: 'Import codes + names' }).click();
    await iframe.getByRole('combobox', { name: 'Select how to import project' }).click();
    await iframe.getByRole('option', { name: 'Import codes + names' }).click();
  });

  await test.step('Save and assert persistence', async () => {
    await iframe.getByRole('button', { name: 'Save' }).click();
    await expect(iframe.getByText('Import settings saved')).toBeVisible();

    // Navigate away and back to import settings
    await iframe.getByRole('menuitem', { name: 'Export settings' }).click();
    await iframe.getByRole('menuitem', { name: 'Import settings' }).click();

    // Assert that the import settings persist
    await expect(iframe.getByLabel('Import GL accounts as categories').getByRole('switch')).toBeChecked();
    await expect(iframe.getByLabel('Import vendor as merchant').getByRole('switch')).not.toBeChecked();

    const expectedValues = [
      'location', 'Cost center',
      'department', 'E2E Custom Field',
      'Project', 'Project',
    ];
    for (let i = 0; i < expectedValues.length; i++) {
      await expect(iframe.getByRole('combobox').nth(i + 1)).toContainText(expectedValues[i], { ignoreCase: true });
    }
  });

  await test.step('Dependent fields', async () => {
    await test.step('Cost code', async () => {
      // "Import cost code and/or cost type from Sage Intacct as dependent fields"
      await iframe.getByRole('checkbox').check();

      // Save should be disabled if neither dependent field is mapped
      await expect(iframe.getByRole('button', { name: 'Save' })).toBeDisabled();

      // Map cost code to a custom field
      await iframe.getByRole('combobox', { name: 'Select expense field' }).first().click();
      await iframe.getByRole('option', { name: 'custom_field' }).click();

      await iframe.getByRole('textbox', { name: 'Enter field type' }).fill('E2E Cost Code');
      await iframe.getByRole('textbox', { name: 'Enter field name' }).fill('Cost Code Placeholder');
      await iframe.getByRole('button', { name: 'Create and save' }).click();

      // Save should be enabled if at least one dependent field is mapped
      await expect(iframe.getByRole('button', { name: 'Save' })).toBeEnabled();

      // Save and assert persistence
      await iframe.getByText('Import settings saved').waitFor({ state: 'hidden' });
      await iframe.getByRole('button', { name: 'Save' }).click();
      await expect(iframe.getByText('Import settings saved')).toBeVisible();

      await iframe.getByRole('menuitem', { name: 'Export settings' }).click();
      await iframe.getByRole('menuitem', { name: 'Import settings' }).click();


      await expect(iframe.getByRole('switch', { name: 'Import cost codes' }).getByRole('switch')).toBeChecked();
      await expect(iframe.getByRole('combobox', { name: 'E2E Cost Code' })).toBeVisible();
    });

    await test.step('Cost type', async () => {
      // Map cost type to another custom field
      await iframe.getByRole('combobox', { name: 'Select expense field' }).first().click();
      await iframe.getByRole('option', { name: 'custom_field' }).click();

      await iframe.getByRole('textbox', { name: 'Enter field type' }).fill('E2E Cost Type');
      await iframe.getByRole('textbox', { name: 'Enter field name' }).fill('Cost Type Placeholder');
      await iframe.getByRole('button', { name: 'Create and save' }).click();
      await iframe.getByRole('switch', { name: 'Import cost type' }).click({ position: { x: 45, y: 5 } });


      // Save and assert persistence
      await iframe.getByText('Import settings saved').waitFor({ state: 'hidden' });
      await iframe.getByRole('button', { name: 'Save' }).click();
      await expect(iframe.getByText('Import settings saved')).toBeVisible();

      await iframe.getByRole('menuitem', { name: 'Export settings' }).click();
      await iframe.getByRole('menuitem', { name: 'Import settings' }).click();

      await expect(iframe.getByRole('switch', { name: 'Import cost type' }).getByRole('switch')).toBeChecked();
      await expect(iframe.getByRole('combobox', { name: 'E2E Cost Type' })).toBeVisible();
    });
  });

  await test.step('Mapping page should update', async () => {
    await iframe.getByRole('menuitem', { name: 'Mapping' }).click();
    await expect(iframe.getByRole('menuitem', { name: 'Cost center' })).toBeVisible();
    await expect(iframe.getByRole('menuitem', { name: 'E2E Custom Field' })).toBeVisible();
  });
});
