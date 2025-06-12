import { getRequestHeaders } from '../utils/api';
import { waitFor } from '../utils/wait';
import { FyleAccount } from './fyle-account';
import { ExpensesService } from './expenses.service';
import { CorporateCardService } from './corporate-card.service';

type ReportState = 'draft' | 'submitted' | 'sent_back' | 'approved' | 'processing' | 'paid';

type ReportsConfig = {
  /**
   * Defines the amount range for expenses within reports.
   * The amount will be randomly chosen from the specified range.
   */
  expensesAmount?: { min: number; max: number };

  /**
   * Expenses ref date
   */
  expensesRefDate?: Date;

  /**
   * Defines the number of expenses to be created within each report.
   */
  expensesCount?: number;

  /**
   * Controls whether empty draft reports should be created or not
   */
  createEmptyDraftReports?: boolean;
};

export class ReportsService {
  private readonly account: FyleAccount;

  private readonly config?: ReportsConfig;

  private expensesService: ExpensesService;

  constructor(account: FyleAccount, config?: ReportsConfig) {
    this.account = account;
    this.config = config;
  }

  private async createSubmittedReports(count: number) {
    const draftReports = await this.createDraftReports(count);
    const reports: any[] = [];

    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    for (const report of draftReports) {
      const payload = {
        data: {
          id: report.id,
        },
      };

      const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/reports/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.log(await response.json());
        throw new Error(`Failed to submit report: ${response.status} ${response.statusText}`);
      }

      const responseJson = await response.json();
      reports.push(responseJson.data);
    }

    return reports;
  }

  private async createSentBackReports(count: number) {
    const submittedReports = await this.createSubmittedReports(count);
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const sentBackReports = submittedReports.map(async (report) => {
      const payload = {
        data: {
          id: report.id,
          comment: 'Sending the report back for E2E tests',
        },
      };

      const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/send_back`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to send back report: ${response.status} ${response.statusText}`);
      }

      const responseJson = await response.json();
      return responseJson.data;
    });

    return await Promise.all(sentBackReports);
  }

  private async createApprovedReports(count: number) {
    const submittedReports = await this.createSubmittedReports(count);
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const payload = {
      data: submittedReports.map((report) => ({
        id: report.id,
      })),
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/approve/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve reports: ${response.status} ${response.statusText}`);
    }

    return submittedReports;
  }

  private async createProcessingReports(count: number) {
    const approvedReports = await this.createApprovedReports(count);
    return await this.manuallyProcessReports(approvedReports);
  }

  private async createPaidReports(count: number) {
    const approvedReports = await this.createApprovedReports(count);
    return await this.markReportsPaid(approvedReports);
  }

  private async markReportsPaid(reports: any[]) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const payload = {
      data: reports.map((report) => ({
        id: report.id,
      })),
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/mark_paid/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const { data, error } = await response.json();
      if (error === 'BulkError') {
        const isSettlementMissing = data.some((entry) => entry.message === 'Report does not have a settlement');
        const isReimbursementMissing = data.some((entry) => entry.message === 'Report does not have a reimbursement');

        if (isSettlementMissing || isReimbursementMissing) {
          console.log('Reports do not have settlements/reimbursements, retrying after 2s');
          await waitFor(2000);
          return await this.markReportsPaid(reports);
        }
      }

      throw new Error(`Failed to mark paid reports: ${response.status} ${response.statusText}`);
    }

    return reports;
  }

  private async manuallyProcessReports(reports: any[]) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const payload = {
      data: reports.map((report) => ({
        id: report.id,
      })),
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/process_manual/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const { data, error } = await response.json();
      if (error === 'BulkError') {
        const isSettlementMissing = data.some((entry) => entry.message === 'Report does not have a settlement');
        const isReimbursementMissing = data.some((entry) => entry.message === 'Report does not have a reimbursement');

        if (isSettlementMissing || isReimbursementMissing) {
          console.log('Reports do not have settlements/reimbursements, retrying after 2s');
          await waitFor(2000);
          return await this.manuallyProcessReports(reports);
        }
      }

      throw new Error(`Failed to process reports: ${response.status} ${response.statusText}`);
    }

    return reports;
  }

  private async addExpensesToReport(report: any, expenses: any) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());

    const expenseIds = expenses.map((expense) => expense.id);

    const payload = {
      data: {
        id: report.id,
        expense_ids: expenseIds,
      },
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/reports/add_expenses`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to add expenses to report: ${response.status} ${response.statusText}`);
    }

    const responseJson = await response.json();
    return responseJson.data;
  }

  private async createDraftReport(purpose: string, createEmptyDraftReport = false) {
    const expensesPerReportCount = this.config?.expensesCount || 1;
    const draftReportPromise = this.createEmptyDraftReport(purpose);

    if (createEmptyDraftReport) {
      return await draftReportPromise;
    }

    const [draftReport, expenses] = await Promise.all([
      draftReportPromise,
      this.expensesService.createReimbursableExpenses(expensesPerReportCount, 'complete'),
    ]);

    return await this.addExpensesToReport(draftReport, expenses);
  }

  private async createDraftReports(count: number, createEmptyDraftReports = false) {
    const reports: any[] = [];
    // Creating reports sequentially, not using promise.all as if we create them parallely backend throws an error when assigning the seq_num property
    for (let i = 0; i < count; i++) {
      const report = await this.createDraftReport(`#${i + 1}: Test Report`, createEmptyDraftReports);
      reports.push(report);
    }

    return reports;
  }

  private async createEmptyDraftReport(purpose: string) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const payload = {
      data: {
        source: 'WEBAPP',
        purpose,
      },
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/spender/reports`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create expense report: ${response.status} ${response.statusText}`);
    }

    const responseJson = await response.json();
    return responseJson.data;
  }

  public async bulkCreate(count: number, state: ReportState) {
    switch (state) {
      case 'draft':
        return await this.createDraftReports(count, this.config?.createEmptyDraftReports);
      case 'sent_back':
        return await this.createSentBackReports(count);
      case 'submitted':
        return await this.createSubmittedReports(count);
      case 'approved':
        return await this.createApprovedReports(count);
      case 'processing':
        return await this.createProcessingReports(count);
      case 'paid':
        return await this.createPaidReports(count);
      default:
        return [];
    }
  }

  public async createSubmittedReportForUser(expenseIds: string[]) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const payload = {
      data: {
        expense_ids: expenseIds,
      },
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/create_and_submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.log(JSON.stringify(payload));
      console.log(JSON.stringify(await response.json()));

      throw new Error(`Failed to submit report: ${response.status} ${response.statusText}`);
    }

    const responseJson = await response.json();
    return responseJson.data;
  }

  public async bulkApproveReportForUsers(reportIds: string[]) {
    const headers = getRequestHeaders(this.account.getOwnerAccessToken());
    const payload = {
      data: reportIds.map((reportId) => ({
        id: reportId,
      })),
    };

    const response = await fetch(`${this.account.apiDomain}/platform/v1/admin/reports/approve/bulk`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve reports: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  public async createCCCReport(state: 'submitted' | 'approved' = 'approved') {
    const corporateCardService = await CorporateCardService.init(this.account);
    const corporateCard = await corporateCardService.createVisaRTFCard('4111111111111111');
    const cccExpenseIDs = await this.expensesService.createCCCExpenses(
      this.config?.expensesCount || 1,
      'complete',
      corporateCard.id,
    );
    await this.createSubmittedReportForUser(cccExpenseIDs);

    if (state === 'approved') {
      const cccReportId = await this.expensesService.getReportIdFromExpense('admin', cccExpenseIDs[0]);
      await this.bulkApproveReportForUsers([cccReportId]);
    }
  }

  public static async init(account: FyleAccount, config?: ReportsConfig) {
    const reportsService = new ReportsService(account, config);
    reportsService.expensesService = await ExpensesService.init(account, {
      amount: config?.expensesAmount,
      refDate: config?.expensesRefDate,
    });

    return reportsService;
  }
}
