import { getApiDomain, getRequestHeaders } from '../../utils/api';
import { faker } from '@faker-js/faker';
import { getSuperAdminAccessToken } from '../../utils/get-super-admin-access-token';
import { waitFor } from '../../utils/wait';
import { OrgService } from './orgs.service';

export class FyleAccount {
  readonly apiDomain: string;

  readonly appDomain: string;

  readonly ownerEmail: string;

  readonly password: string;

  readonly accountDomain: string;

  readonly orgName: string;

  public orgId: string;

  private ownerRefreshToken: string;

  private ownerAccessToken: string;

  constructor(ownerEmail?: string) {
    this.apiDomain = getApiDomain();
    this.appDomain = (process.env.APP_DOMAIN || '').replace(/\/+$/, '');
    this.accountDomain = 'fyleforintegrationse2etests.com';
    this.ownerEmail = ownerEmail || this.generateEmail('owner');
    this.password = 'Password@1234';
    this.orgName = "Integrations E2E Tests";

    // Hardcoding seed value to make sure we get same set of random numbers every time
    faker.seed(0);
  }

  private async getRefreshToken() {
    const response = await fetch(`${this.apiDomain}/api/auth/basic/signin`, {
      method: 'POST',
      body: JSON.stringify({
        email: this.ownerEmail,
        password: this.password,
      }),
      headers: getRequestHeaders(),
    });
    return (await response.json())['refresh_token'];
  }

  private async getAccessToken(refreshToken?: string) {
    const response = await fetch(`${this.apiDomain}/api/auth/access_token`, {
      method: 'POST',
      body: JSON.stringify({
        refresh_token: refreshToken || this.ownerRefreshToken,
      }),
      headers: getRequestHeaders(),
    });
    if (response.ok) {
      return (await response.json())['access_token'];
    } else {
      throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
    }
  }

  private async getUserOrgRefreshToken(orgId: string, userAccessToken: string) {
    const response = await fetch(`${this.apiDomain}/api/orgs/${orgId}/refresh_token`, {
      method: 'POST',
      headers: getRequestHeaders(userAccessToken),
    });
    return (await response.json())['refresh_token'];
  }

  private async markUserActive(userAccessToken?: string) {
    const accessToken = userAccessToken ? userAccessToken : this.ownerAccessToken;
    const headers = getRequestHeaders(accessToken);
    await fetch(`${this.apiDomain}/api/orgusers/current/mark_active`, {
      method: 'POST',
      headers,
    });
  }

  private async verifyUser(email: string): Promise<string> {
    const response = await fetch(`${this.apiDomain}/api/auth/test/email_verify`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: getRequestHeaders(process.env.SUPER_ADMIN_ACCESS_TOKEN),
    });

    if (response.ok) {
      const { refresh_token } = await response.json();
      return refresh_token;
    } else if (response.status === 401) {
      // If super admin access token is expired, refetch it
      process.env.SUPER_ADMIN_ACCESS_TOKEN = await getSuperAdminAccessToken();
      return this.verifyUser(email);
    } else {
      throw new Error(`User verification failed ${response.status} ${response.statusText}`);
    }
  }

  public async deleteAll(orgs, ownerAccessToken: string) {
    for (const org of orgs) {
      const userOrgRefreshToken = await this.getUserOrgRefreshToken(org.id, ownerAccessToken);
      const accessToken = await this.getAccessToken(userOrgRefreshToken);
      const response = await fetch(`${this.apiDomain}/platform/v1/owner/orgs/delete`, {
        method: 'POST',
        headers: getRequestHeaders(accessToken),
        body: JSON.stringify({
          data: { id: org.id },
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to delete account with orgId ${org.id} ${response.status} ${response.statusText}`);
      }
    }
  }

  public async delete(isRefreshTokenExpired = false) {
    if (process.env.LOCAL_DEV_EMAIL) {
      console.log('Local dev email detected, skipping account deletion');
      return;
    }

    const ownerAccessToken = isRefreshTokenExpired
      ? await this.getAccessToken(await this.getRefreshToken())
      : this.ownerAccessToken;
    const headers = getRequestHeaders(ownerAccessToken);
    const orgResponse = await fetch(`${this.apiDomain}/api/orgs`, { method: 'GET', headers });
    const orgs = await orgResponse.json();
    if (orgs.length > 1) {
      return await this.deleteAll(orgs, ownerAccessToken);
    }

    const org = orgs[0];
    const response = await fetch(`${this.apiDomain}/platform/v1/owner/orgs/delete`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: { id: org.id },
      }),
    });

    if (response.ok) {
      console.log('Deleted account:', this.ownerEmail);
      return await response.json();
    } else {
      throw new Error(`Failed to delete account: ${response.status} ${response.statusText}`);
    }
  }

  public generateEmail(role: string) {
    return process.env.LOCAL_DEV_EMAIL ?? `${role}-${Date.now()}@${this.accountDomain}`;
  }

  public getOwnerAccessToken() {
    return this.ownerAccessToken;
  }

  public static async create(orgCurrency = 'USD'): Promise<FyleAccount> {
    const existingEmail = (process.env.LOCAL_DEV_EMAIL || '').trim() || undefined;
    const account = new FyleAccount(existingEmail);

    if (existingEmail) {
      const refreshToken = await account.verifyUser(account.ownerEmail);
      account.ownerAccessToken = await account.getAccessToken(refreshToken);

      console.log('Local dev email detected, skipping account creation');
      return account;
    }

    const signupPayload = {
      email: account.ownerEmail,
      password: account.password,
      full_name: 'Owner',
      title: 'Owner',
      internal_signup_token: process.env.INTERNAL_SIGNUP_TOKEN,
      signup_params: {
        org_currency: orgCurrency,
      },
    };

    const signupUrls = (process.env.API_SIGNUP_URL || '').trim()
      ? [(process.env.API_SIGNUP_URL || '').trim()]
      : [
          `${account.apiDomain}/api/auth/basic/signup`,
          `${account.apiDomain}/platform/v1/auth/signup`,
        ];

    let response: Response;
    let signupUrl: string;
    let lastStatus = 0;
    let lastBody = '';

    for (signupUrl of signupUrls) {
      console.log('Signup URL:', signupUrl);
      response = await fetch(signupUrl, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(signupPayload),
      });
      if (response.ok) {
        break;
      }
      lastStatus = response.status;
      lastBody = await response.text();
      if (lastStatus !== 404) {
        console.log(`Signup ${lastStatus} at ${signupUrl}: ${lastBody || response.statusText}`);
      }
      if (response.status === 404 && signupUrls.indexOf(signupUrl) < signupUrls.length - 1) {
        console.log(`Signup 404 at ${signupUrl}, trying next URL...`);
        continue;
      }
      break;
    }

    if (response!.ok) {
      console.log('ownerEmail:', account.ownerEmail);
    } else if (lastStatus >= 500) {
      console.log(`Failed to create account due to ${lastStatus} server issue, retrying after 2s...`);
      await waitFor(2000);
      return this.create(orgCurrency);
    } else if (lastStatus === 404) {
      throw new Error(
        `Failed to create account: 404 Not Found. ` +
        `Tried: ${signupUrls.join(', ')}. ` +
        `Response: ${lastBody || 'empty'}. ` +
        `Ensure API_DOMAIN is correct and signup is enabled for this environment.`
      );
    } else {
      throw new Error(
        `Failed to create account: ${lastStatus} ${response!.statusText}. ` +
        `URL: ${signupUrls.join(', ')}. Response: ${lastBody || 'empty'}. ` +
        `Check INTERNAL_SIGNUP_TOKEN and that signup is allowed for this environment.`
      );
    }

    const refreshToken = await account.verifyUser(signupPayload.email);
    account.ownerAccessToken = await account.getAccessToken(refreshToken);

    await account.markUserActive();
    await account.waitForOnboarding();

    const orgService = new OrgService(account);
    const org = await orgService.updateOrg({ name: account.orgName });
    account.orgId = org.id;

    return account;
  }

  public async waitForOnboarding() {
    const response = await fetch(`${this.apiDomain}/platform/v1/spender/onboarding`, {
      headers: getRequestHeaders(this.ownerAccessToken),
    });

    if (response.status === 404) {
      console.log('Onboarding data not initialised for user yet, retrying after 2s...');
      await waitFor(2000);
      return await this.waitForOnboarding();
    }
  }

  public async verifyAndActivateUser(userEmail: string) {
    const refreshToken = await this.verifyUser(userEmail);
    const userAccessToken = await this.getAccessToken(refreshToken);
    await this.markUserActive(userAccessToken);
  }
}
