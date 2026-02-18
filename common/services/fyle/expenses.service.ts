import { getRequestHeaders } from '../../utils/api';
import { waitFor } from '../../utils/wait';
import { FyleAccount as Account } from './fyle-account.service';
import { faker } from '@faker-js/faker';

type ExpenseState = 'incomplete' | 'complete';

type SourceAccountType = 'PERSONAL_CASH_ACCOUNT' | 'PERSONAL_CORPORATE_CREDIT_CARD_ACCOUNT';

type ExpensesConfig = {
  /**
   * Defines the range for the expense amount.
   * The amount will be randomly chosen from the specified range.
   */
  amount?: { min: number; max: number };

  /**
   * The reference date to be used for generating random dates
   */
  refDate?: Date;

  /**
   * The date range for the expenses to be created
   */
  dateRange?: { startDate: Date; endDate: Date };
};

export class ExpensesService {
  private categories: any[];

  private sourceAccounts: any[];

  private readonly account: Account;

  private readonly config?: ExpensesConfig;

  constructor(account: Account, config?: ExpensesConfig) {
    this.account = account;
    this.config = config;
  }

  private getRandomAmount() {
    const min = this.config?.amount?.min || 1;
    const max = this.config?.amount?.max || 100;

    return faker.number.float({ min, max });
  }

  private getRandomSpentAt() {
    if (this.config?.dateRange) {
      return faker.date.between({ from: this.config.dateRange.startDate, to: this.config.dateRange.endDate });
    } else {
      return faker.date.recent({ days: 30, refDate: this.config?.refDate });
    }
  }

  private getExpenseCategories(systemCategories?: string[]) {
    console.log('Categories fetched', this.categories);
    console.log('System categories', systemCategories);
    if (systemCategories?.length) {
      console.log('Filtering categories if', this.categories.filter((category) => systemCategories.includes(category.system_category)));
      return this.categories.filter((category) => systemCategories.includes(category.system_category));
    } else {
      console.log('Filtering categories else', this.categories.filter(
        (category) => !['Mileage', 'Per Diem', 'Unspecified'].includes(category.system_category),
      ));
      return this.categories.filter(
        (category) => !['Mileage', 'Per Diem', 'Unspecified'].includes(category.system_category),
      );
    }
  }

  private getUnspecifiedCategory() {
    return this.categories.find((category) => category.system_category === 'Unspecified');
  }

  private async getSourceAccounts() {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/accounts`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
    }

    const { data: accounts } = await response.json();
    return accounts;
  }

  private async getCategories() {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const params = new URLSearchParams({
      is_enabled: 'eq.true',
      system_category: 'not_in.(Activity)',
    });

    const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/categories?${params}`, {
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.status} ${response.statusText}`);
    }

    const { data: categories } = await response.json();

    if (categories.length === 0) {
      console.log('Categories not initialised in the org yet, retrying after 2s...');
      await waitFor(2000);

      return await this.getCategories();
    }
    console.log('Categories fetched successfully', categories);

    return categories;
  }

  private async getAdminCategory() {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/categories`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch admin category: ${response.status} ${response.statusText}`);
    }

    const { data: category } = await response.json();

    console.log('Admin category fetched successfully', category.length);

    return category;
  }

  private async createOrUpdateCategory() {
    const adminCategory = await this.getAdminCategory();
    const unspecifiedCategory = adminCategory.find((category) => category.name === 'Unspecified');
    if (unspecifiedCategory) {
      unspecifiedCategory.is_enabled = true;
    }

    console.log('Unspecified category', unspecifiedCategory);
    const customCategory = [{
      "name": "Test Category",
      "sub_category": "Turbo charged",
      "is_enabled": true,
      "system_category": "Others",
      "code": "C1234",
      "restricted_project_ids": [],
      "restricted_spender_user_ids": []
    },{
      code: null,
      created_at: '2026-02-18T08:58:19.142062+00:00',
      display_name: 'Train',
      is_enabled: true,
      name: 'Trainss',
      org_id: 'orVP8LIe3rE2',
      restricted_project_ids: null,
      restricted_spender_user_ids: [],
      sub_category: null,
      system_category: 'Train',
      updated_at: '2026-02-18T08:58:19.142064+00:00'
    }]

    const updatecategory = unspecifiedCategory ? [unspecifiedCategory].concat(customCategory) : customCategory;
    const payload = {
      data: updatecategory
    }

    console.log('Payload for category update', payload);

    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/categories/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log('Response for category update', response);

    if (!response.ok) {
      throw new Error(`Failed to create or update category: ${response.status} ${response.statusText}`);
    }

    const updatedAdminCategory = await this.getAdminCategory();

    console.log('Updated admin category', updatedAdminCategory.length);

    return updatedAdminCategory;
  }

  private async createCCCTransaction(
    cardId: string,
    state: ExpenseState,
    systemCategories?: any[],
    customPayload?: any,
  ) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const randomCategory = faker.helpers.arrayElement(this.getExpenseCategories(systemCategories));
    const category = state === 'incomplete' ? this.getUnspecifiedCategory() : randomCategory;

    const payload = {
      data: {
        spent_at: this.getRandomSpentAt(),
        amount: this.getRandomAmount(),
        category: category.name,
        corporate_card_id: cardId,
        currency: 'USD',
        ...(customPayload || {}),
      },
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/corporate_card_transactions`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers,
    });

    if (!response.ok) {
      throw new Error(`Failed to create corporate card transaction: ${response.status} ${response.statusText}`);
    }

    const { data: transaction } = await response.json();

    return transaction;
  }

  private async getMatchedExpenseIDs(transactions: any[]) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const params = new URLSearchParams({
      id: `in.(${transactions.map((transaction) => transaction.id)})`,
    });

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/corporate_card_transactions?${params}`, {
      headers,
    });

    const { data } = await response.json();

    if (data.some((transaction) => transaction.matched_expense_ids.length === 0)) {
      console.log('Expenses not auto-created from CCTs yet, retrying after 2s...');
      await waitFor(2000);
      return await this.getMatchedExpenseIDs(transactions);
    } else {
      return data.flatMap((transaction) => transaction.matched_expense_ids);
    }
  }

  private async createExpense(
    state: ExpenseState,
    sourceAccountType: SourceAccountType,
    systemCategories?: string[],
    userEmail?: string,
    customPayload?: any,
  ) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const randomCategory = faker.helpers.arrayElement(this.getExpenseCategories(systemCategories));
    const category = state === 'incomplete' ? this.getUnspecifiedCategory() : randomCategory;

    const sourceAccount = this.sourceAccounts.find((account) => account.type === sourceAccountType);

    const payload = {
      data: {
        spent_at: this.getRandomSpentAt(),
        source: 'WEBAPP',
        claim_amount: this.getRandomAmount(),
        purpose: 'Test Expense for E2E',
        category_id: category.id,
        source_account_id: sourceAccount.id,
        ...(customPayload || {}),
      } as any,
    };

    if (userEmail) {
      payload.data.assignee_user_email = userEmail;
      payload.data.admin_amount = payload.data.claim_amount;
    }

    const role = userEmail ? 'admin' : 'spender';

    console.log('Payload for expense creation', payload);

    const response = await fetch(`${this.account.apiDomain}/platform/v1/${role}/expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    console.log('Response for expense creation', response);

    if (!response.ok) {
      throw new Error(`Failed to create expense: ${response.status} ${response.statusText}`);
    }

    const { data: expense } = await response.json();

    return expense;
  }

  public async createReimbursableExpenses(
    count: number,
    state: ExpenseState,
    systemCategories?: string[],
    userEmail?: string,
  ) {
    const expenses: any[] = [];
    const batchSize = 3;

    this.sourceAccounts = await this.getSourceAccounts();

    // Creating expenses in parallel in batches of 3
    for (let i = 0; i < count; i += batchSize) {
      const batch = Array.from({ length: Math.min(batchSize, count - i) }).map(() =>
        this.createExpense(state, 'PERSONAL_CASH_ACCOUNT', systemCategories, userEmail),
      );
      const results = await Promise.all(batch);
      expenses.push(...results);
    }

    return expenses;
  }

  public async createCCCExpenses(
    count: number,
    state: ExpenseState,
    cardId: string,
    systemCategories?: string[],
    customPayload?: any,
  ) {
    const transactions: any[] = [];
    const batchSize = 3;

    this.sourceAccounts = await this.getSourceAccounts();

    // Creating expenses in parallel in batches of 3
    for (let i = 0; i < count; i += batchSize) {
      const batch = Array.from({ length: Math.min(batchSize, count - i) }).map(async () => {
        const cardTransaction = await this.createCCCTransaction(cardId, state, systemCategories, customPayload);
        return cardTransaction;
      });

      const results = await Promise.all(batch);
      transactions.push(...results);
    }

    const expenseIDs = await this.getMatchedExpenseIDs(transactions);

    return expenseIDs;
  }

  public async getReportIdFromExpense(role: string, expenseId: string) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const expense = await fetch(`${this.account.apiDomain}/platform/v1/${role}/expenses/?id=eq.${expenseId}`, {
      method: 'GET',
      headers,
    }).then((response) => response.json());

    return expense.data[0].report_id;
  }

  public static async init(account: Account, config?: ExpensesConfig) {
    const expensesService = new ExpensesService(account, config);
    expensesService.categories = await expensesService.createOrUpdateCategory();
    return expensesService;
  }
}
