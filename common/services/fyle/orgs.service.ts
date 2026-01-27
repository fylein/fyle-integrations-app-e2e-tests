import { getRequestHeaders } from "../../utils/api";
import { FyleAccount } from "./fyle-account.service";

export class OrgService {

  constructor(private account: FyleAccount) {
  }

  public async getOrgs() {
    const ownerAccessToken = this.account.getOwnerAccessToken();
    const headers = getRequestHeaders(ownerAccessToken);
    const orgResponse = await fetch(`${process.env.API_DOMAIN}/api/orgs`, { method: 'GET', headers });
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
    const orgResponse = await fetch(`${process.env.API_DOMAIN}/api/orgs/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updatedOrg)
    });
    return await orgResponse.json();;
  }
}
