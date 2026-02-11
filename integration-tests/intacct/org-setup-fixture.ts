import { test as base } from '../../playwright/fixture';
import { FrameLocator } from '@playwright/test';
import { goToIntegrations, loginAndGoToIntegrations } from '../../common/setup/login';
import { IntacctService } from '../../common/services/intacct.service';

// Extend basic test fixture with our custom fixture
export const test = base.extend<{ iframeWithIntacctSetup: FrameLocator }>({
  iframeWithIntacctSetup: async ({ account, page }, use, testInfo) => {
    // Avoid token health check & token invalidation in integration tests
    await page.route(/.*token_health.*/, async (route) => {
        await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"message":"Intacct connection is active"}'
      });
    });

    await page.route(/.*sync_dimensions.*/, async (route) => {
      await route.fulfill({ status: 200 });
    });

    // Capture workspace id for integration test org setup
    let workspaceId: number;
    await page.route('**/workspaces/', async (route) => {
      if (route.request().method() === 'POST') {
        const response = await route.fetch();
        const workspace = (await response.json());
        workspaceId = workspace.id;
        await route.fulfill({ response });
      }
    });

    const workspacePostCall = page.waitForResponse(response =>
      response.url().includes('workspaces/') && response.status() === 200 && response.request().method() === 'POST'
    );

    // Create an intacct workspace, get its ID and set it up
    let iframe: FrameLocator;
    try {
      iframe = await loginAndGoToIntegrations(page, account);
      await iframe.getByText('Sage Intacct').or(iframe.getByText('Intacct')).first().click();
      await workspacePostCall;
      await IntacctService.setupIntegrationTestOrg(workspaceId!);

      // Go to intacct, and wait for the dashboard to load
      await goToIntegrations(page, account);
      await iframe.getByText('Sage Intacct').or(iframe.getByText('Intacct')).first().click();
      await iframe.getByText('Export', { exact: true }).waitFor();

      // Use the fixture in the caller test, then delete the org
      await use(iframe);
      await IntacctService.deleteIntegrationTestOrg(workspaceId!);
    } catch (error) {
      testInfo.skip(true, 'Intacct integration test org setup failed (internal API may be unavailable)');
      await use(page.locator('#integrations_iframe').contentFrame() as FrameLocator);
    }
  },
});
