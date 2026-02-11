import { FrameLocator, Locator, Page } from '@playwright/test';

export const waitFor = (timeout: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
};

/**
 * Wait for the combobox options to load. If the options are not loaded, reload the page until they are. Maximum 3 attempts by default.
 * @param page - The page object
 * @param iframe - The iframe object
 * @param combobox - The combobox locator
 * @param setupFn - A function to run before clicking the combobox
 * @param maxAttempts - The number of reloads before failing the test
 */
export const waitForComboboxOptions = async (
  page: Page,
  iframe: FrameLocator,
  combobox: Locator,
  setupFn?: () => Promise<void>,
  maxAttempts: number = 6,
  waitTime: number = 5_000
) => {
  await setupFn?.();

  const name =
    (await combobox.getAttribute('aria-label')) ||
    (await combobox.getAttribute('name')) ||
    'Combobox';
  console.log(`Checking for options in '${name}'...`);

  let currentCombobox = combobox;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await currentCombobox.click();
    } catch (error) {
      // Locator may be stale after reload; re-acquire from iframe
      currentCombobox = iframe.getByRole('combobox', { name });
      await currentCombobox.click();
    }
    // If the options have not loaded, reload the page and try again
    if (await iframe.getByRole('option', { name: 'No results found' }).isVisible({ timeout: 1_000 }).catch(() => false)) {
      await waitFor(waitTime);
      console.log(`🔃 '${name}' options not loaded on attempt ${i + 1}/${maxAttempts}, reloading...`);
      await page.reload();
      await page.locator('#integrations_iframe').waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
      await waitFor(2_000);
      await setupFn?.();
      // Re-acquire combobox after reload (previous locator is stale)
      currentCombobox = iframe.getByRole('combobox', { name });
    } else {
      console.log(`✅ '${name}' options loaded on attempt ${i + 1}/${maxAttempts}`);
      // Close the combobox before returning
      try {
        await currentCombobox.click();
      } catch (error) {
        currentCombobox = iframe.getByRole('combobox', { name });
        await currentCombobox.click();
      }
      return;
    }
  }
  throw new Error(`❌ '${name}' options not loaded after ${maxAttempts} attempts`);
};
