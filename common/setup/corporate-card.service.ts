import { getRequestHeaders } from '../utils/api';
import { FyleAccount } from './fyle-account';
import { OrgSettingsService } from './org-settings.service';

export class CorporateCardService {
  private readonly account: FyleAccount;

  constructor(account: FyleAccount) {
    this.account = account;
  }

  public async getOrCreateVisaRTFCard(cardNumber: string) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const payload = {
      data: {
        card_number: cardNumber,
      },
    };

    const corporateCards = await this.getCorporateCards();
    const existingCard = corporateCards.find((card: any) => {
      const a = card.card_number;
      const b = cardNumber;
      return a.slice(0, 4) === b.slice(0, 4) && a.slice(-4) === b.slice(-4);
    });

    if (existingCard) {
      console.log(`Card ${cardNumber} already exists (${existingCard.id})`);
      return existingCard;
    }

    const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/corporate_cards/visa_enroll`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to enroll corporate card: ${response.status} ${response.statusText}`);
    }

    const { data: corporateCard } = await response.json();
    return corporateCard;
  }

  public async getCorporateCards() {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/corporate_cards`, { headers });
    const body = await response.json();
    return body.data;
  }

  public static async init(account: FyleAccount) {
    const orgSettingsService = await OrgSettingsService.init(account);
    await orgSettingsService.updateOrgSettings({
      corporate_credit_card_settings: {
        allowed: true,
        enabled: true,
        bank_statement_upload_settings: {
          enabled: true,
          generic_statement_parser_enabled: true,
          bank_statement_parser_endpoint_settings: [],
        },
        bank_data_aggregation_settings: {
          enabled: false,
          aggregator: null,
          auto_assign: false,
        },
        auto_match_allowed: true,
        enable_auto_match: true,
        allow_approved_plus_states: true,
        disable_mark_personal: false,
      },
      visa_enrollment_settings: {
        allowed: true,
        enabled: true,
      },
      mastercard_enrollment_settings: {
        allowed: true,
        enabled: true,
      },
    });

    const corporateCardService = new CorporateCardService(account);
    return corporateCardService;
  }
}
