import { Page } from '@playwright/test';
import { FyleAccount } from '../services/fyle/fyle-account.service';

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


export const loginAndGoToIntegrations = async (page: Page, account: FyleAccount) => {
  await abortTracker(page);

  const appDomain = account.appDomain;
  const adminTasksLink = `${appDomain}/app/admin/#/admin_tasks`;
  const encodedRedirectUrl = Buffer.from(adminTasksLink).toString('base64');
  await page.goto(`${appDomain}/app/accounts/#/signin?fyle_redirect_url=${encodedRedirectUrl}`);

  await page.getByPlaceholder('Enter your work email here').click();
  await page.getByPlaceholder('Enter your work email here').fill(account.ownerEmail);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Enter your password here').fill(account.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  // Wait for post-login: either redirect to app (existing user) or onboarding "Next" appears (new user)
  await Promise.race([
    page.waitForURL(/\/(app\/|accounts\/)/, { timeout: 6_000 }),
    page.getByRole('button', { name: 'Next' }).waitFor({ state: 'visible', timeout: 6_000 }),
  ]).catch(() => {});

  // If onboarding "Next" is visible, complete it; otherwise we were redirected and skip
  const nextBtn = page.getByRole('button', { name: 'Next' });
  if (await nextBtn.isVisible({ timeout: 6_000 }).catch(() => false)) {
    await nextBtn.click();
    await page.getByRole('button', { name: 'Let\'s start' }).click();
  }

  // Wait for app to be ready: must leave sign-in page (URL contains /app/ but not signin)
  await page.waitForURL((url) => url.pathname.includes('/app/') && !url.hash.includes('signin'), { timeout: 6_000 }).catch(() => {});

  // Wait for sidebar to load: Integrations button can appear after navigation
  const integrationsButton = page.getByRole('button', { name: /Integrations/ });
  await integrationsButton.first().waitFor({ state: 'visible', timeout: 6_000 });
  const buttons = await integrationsButton.all();
  await buttons[buttons.length - 1].click();

  return page.locator('#integrations_iframe').contentFrame();
};

export const goToIntegrations = async (page: Page, account: FyleAccount) => {
  await page.goto(account.appDomain);
  const buttons = await page.getByRole('button', { name: /Integrations/ }).all();
  if (!buttons.length) throw new Error('No Integrations button found');
  await buttons[buttons.length - 1].waitFor({ state: 'visible', timeout: 6_000 });
  await buttons[buttons.length - 1].click();
  return page.locator('#integrations_iframe').contentFrame();
};
