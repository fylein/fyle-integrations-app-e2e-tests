import { getApiDomain, getRequestHeaders } from "../../utils/api";
import { FyleAccount } from "./fyle-account.service";

export class OrgService {

  constructor(private account: FyleAccount) {
  }

  public async getOrgs() {
    const ownerAccessToken = this.account.getOwnerAccessToken();
    const headers = getRequestHeaders(ownerAccessToken);
    const orgResponse = await fetch(`${getApiDomain()}/platform/v1/spender/orgs`, { method: 'GET', headers });
    const { data: orgs } = await orgResponse.json();
    return orgs;
  }

  public async getOrgId() {
    return (await this.getOrgs())[0].id;
  }

  public async updateOrg(org: any) {
    const currentOrg = (await this.getOrgs())[0];
    const updatedOrg = { ...currentOrg, ...org };

    const ownerAccessToken = this.account.getOwnerAccessToken();
    const headers = getRequestHeaders(ownerAccessToken);
    const orgResponse = await fetch(`${getApiDomain()}/api/orgs/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updatedOrg)
    });
    return await orgResponse.json();
  }
}
