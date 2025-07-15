import { FrameLocator, expect } from '@playwright/test';

export class PaginatedPage {
  private iframe: FrameLocator;

  private rowIdentifier: string;

  constructor(iframe: FrameLocator, rowIdentifier: string) {
    this.iframe = iframe;
    this.rowIdentifier = rowIdentifier;
  }

  /**
   * Changes the page size and verifies pagination behavior
   */
  async verifyPagination(): Promise<void> {
    // Change page size
    await this.iframe.getByRole('combobox', { name: '50' }).click();
    await this.iframe.getByRole('option', { name: '10', exact: true }).click();

    // Verify total page count
    await expect(this.iframe.getByText(`1 of 2`)).toBeVisible();

    // Verify first page record count
    await expect(this.iframe.getByRole('row', { name: this.rowIdentifier })).toHaveCount(10);

    // Navigate to next page and verify record count
    await this.iframe.getByRole('button', { name: 'Next page' }).click();
    await expect(this.iframe.getByRole('row', { name: this.rowIdentifier }).first()).toBeVisible();
  }
}