import { Page } from '@playwright/test';
import { FyleAccount } from './fyle-account';

async function abortTracker(page: Page) {
  // Abort all requests for tracking.
  await page.route(/.*mixpanel.*/, async (route) => {
    await route.abort();
  });

  // Abort any onboarding flows from Appcues.
  await page.route(/.*appcues.*/, async (route) => {
    await route.abort();
  });
}


export const login = async (page: Page, account: FyleAccount) => {
  await abortTracker(page);

  const appDomain = account.appDomain;
  const adminTasksLink = `${appDomain}/app/admin/#/admin_tasks`;
  await page.goto(`${appDomain}/app/accounts/#/signin?fyle_redirect_url=${btoa(adminTasksLink)}`);

  await page.getByPlaceholder('Enter your work email here').click();
  await page.getByPlaceholder('Enter your work email here').fill(account.ownerEmail);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Enter your password here').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
};
