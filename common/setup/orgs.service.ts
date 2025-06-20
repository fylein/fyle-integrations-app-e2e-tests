import { getRequestHeaders } from "../utils/api";
import { FyleAccount } from "./fyle-account";

export class OrgService {

  constructor(private account: FyleAccount) {
  }

  public async getOrg() {
    const ownerAccessToken = this.account.getOwnerAccessToken();
    const headers = getRequestHeaders(ownerAccessToken);
    const orgResponse = await fetch(`${process.env.API_DOMAIN}/api/orgs`, { method: 'GET', headers });
    return await orgResponse.json();
  }

  public async getOrgId() {
    return (await this.getOrg())[0].id;
  }
}
