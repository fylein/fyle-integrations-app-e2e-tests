import { getRequestHeaders } from '../utils/api';
import { FyleAccount } from './fyle-account';

export class OrgSettingsService {
  private readonly account: FyleAccount;

  constructor(account: FyleAccount) {
    this.account = account;
  }

  async getOrgSettings() {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const response = await fetch(`${this.account.apiDomain}/api/org/settings`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch org settings: ${response.status} ${response.statusText}`);
    }

    const { data: orgSettings } = await response.json();
    return orgSettings;
  }

  async updateOrgSettings(params: any) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const orgSettings = await this.getOrgSettings();

    const payload = {
      ...orgSettings,
      ...params,
    };

    const response = await fetch(`${this.account.apiDomain}/api/org/settings`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to update org settings: ${response.status} ${response.statusText}`);
    }

    const updatedOrgSettings = await response.json();
    return updatedOrgSettings;
  }

  public static async init(account: FyleAccount) {
    const orgSettingsService = new OrgSettingsService(account);
    return orgSettingsService;
  }
}
