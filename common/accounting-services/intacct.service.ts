export class IntacctService {
  constructor(private orgId: string) {}

  public async getCCTByInternalId(internalId: string) {
    const response = await fetch(`${process.env.API_DOMAIN}/intacct-api/internal_api/exported_entry/?` + new URLSearchParams({
      org_id: this.orgId,
      resource_type: 'charge_card_transaction',
      internal_id: internalId
    }).toString(),
    {
      method: 'GET',
      headers: {
        'X-Internal-API-Client-ID': process.env.INTERNAL_API_CLIENT_ID || '',
      }
    });

    return (await response.json()).data.cctransaction;
  }
}