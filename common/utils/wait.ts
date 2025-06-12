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

  for (let i = 0; i < maxAttempts; i++) {
    await combobox.click();
    // If the options have not loaded, reload the page and try again
    if (await iframe.getByRole('option', { name: 'No results found' }).isVisible({ timeout: 1_000 })) {
      await waitFor(waitTime);
      console.log(`🔃 '${name}' options not loaded on attempt ${i + 1}/${maxAttempts}, reloading...`);
      await page.reload();
      await setupFn?.();
    } else {
      console.log(`✅ '${name}' options loaded on attempt ${i + 1}/${maxAttempts}`);
      // Close the combobox before returning to avoid blocking the next test
      await combobox.click();
      return;
    }
  }
  throw new Error(`❌ '${name}' options not loaded after ${maxAttempts} attempts`);
};
