import { test as base, FrameLocator } from '@playwright/test';
import { FyleAccount } from '../../common/services/fyle/fyle-account.service';
import { goToIntegrations } from '../../common/setup/login';
import { IntacctService } from '../../common/services/intacct.service';

// Extend basic test fixture with our custom fixture
export const test = base.extend<{ iframeWithIntacctSetup: FrameLocator }>({
  iframeWithIntacctSetup: async ({ page }, use) => {
    // Avoid token health check & token invalidation in integration tests
    await page.route(/.*token_health.*/, async (route) => {
      await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"message":"Intacct connection is active"}'
      });
    });

    // Capture workspace id for integration test org setup
    let workspaceId;
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
    const account = new FyleAccount(process.env.INTEGRATION_TESTS_EMAIL!);
    const iframe = await goToIntegrations(page, account);
    iframe.getByText('Intacct').click();
    await workspacePostCall;
    await IntacctService.setupIntegrationTestOrg(workspaceId);

    // Go to intacct, and wait for the dashboard to load
    await goToIntegrations(page, account);
    await iframe.getByText('Intacct').click();
    await iframe.getByText('Successful expenses').waitFor();

    // Use the fixture in the caller test, then delete the org
    await use(iframe);
    await IntacctService.deleteIntegrationTestOrg(process.env.INTEGRATION_TESTS_ORG_ID!);
  },
});
