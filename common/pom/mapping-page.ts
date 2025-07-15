import { FrameLocator } from '@playwright/test';

export class MappingPage {
  private iframe: FrameLocator;

  private sourceAttribute: string;

  constructor(iframe: FrameLocator, sourceAttribute: string) {
    this.iframe = iframe;
    this.sourceAttribute = sourceAttribute;
  }

  /**
   * Gets the count of unmapped items for the configured source attribute
   */
  async getUnmappedCount(): Promise<number> {
    const unmappedLabel = `Unmapped ${this.sourceAttribute}`;
    const unmappedText = await this.iframe.getByLabel(unmappedLabel).textContent();
    const unmappedCount = parseInt(unmappedText?.match(new RegExp(`Unmapped ${this.sourceAttribute}(\\d+)`))?.[1] ?? '0');
    return unmappedCount;
  }

  /**
   * Gets the total count of items for the configured source attribute
   */
  async getTotalCount(): Promise<number> {
    const totalLabel = `Total ${this.sourceAttribute}`;
    const totalText = await this.iframe.getByLabel(totalLabel).textContent();
    const totalCount = parseInt(totalText?.match(new RegExp(`Total ${this.sourceAttribute}(\\d+)`))?.[1] ?? '0');
    return totalCount;
  }
}