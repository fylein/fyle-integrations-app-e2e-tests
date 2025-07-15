export class IntacctService {
  public static async getCCTByInternalId(orgId: string, internalId: string) {
    const response = await fetch(`${process.env.API_DOMAIN}/intacct-api/internal_api/exported_entry/?` + new URLSearchParams({
      org_id: orgId,
      resource_type: 'charge_card_transaction',
      internal_id: internalId
    }).toString(),
    {
      method: 'GET',
      headers: {
        'X-Internal-API-Client-ID': process.env.INTERNAL_API_CLIENT_ID || '',
      }
    });

    if (response.ok) {
      return (await response.json()).data.cctransaction;
    }

    console.error(response.status);
    console.error(await response.json());
    throw new Error('Failed to fetch CCT from Intacct');
  }

  public static async setupIntegrationTestOrg(workspaceId: number) {
    const response = await fetch(`${process.env.API_DOMAIN}/intacct-api/internal_api/e2e/setup_org/`,
    {
      method: 'POST',
      headers: {
        'X-Internal-API-Client-ID': process.env.INTERNAL_API_CLIENT_ID || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workspace_id: workspaceId,
      }),
    });


    if (response.ok) {
      console.log('Intacct integration test org setup successful. workspace_id: ', workspaceId);
      return (await response.json());
    }

    console.error(response.status);
    console.error(await response.json());
    throw new Error('Failed to setup Intacct integration test org');
  }

  public static async deleteIntegrationTestOrg(orgId: string) {
    const response = await fetch(`${process.env.API_DOMAIN}/intacct-api/internal_api/e2e/destroy/`,
    {
      method: 'POST',
      headers: {
        'X-Internal-API-Client-ID': process.env.INTERNAL_API_CLIENT_ID || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        org_id: orgId,
      }),
    });

    if (response.ok) {
      console.log('Intacct org deleted');
      return (await response.json());
    }

    console.error(response.status);
    console.error(await response.json());
    throw new Error('Failed to delete Intacct integration test org');
  }
}
