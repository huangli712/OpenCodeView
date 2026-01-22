import type { TokenUsage, InteractionFile, SessionData, PricingData } from "./types";
import { FileManager } from "./fileutil";

export class CostCalculator {
  private pricingData: PricingData;
  private initialized: boolean = false;
  private initializationError: string | null = null;

  constructor() {
    this.pricingData = {};
  }

  async init(): Promise<void> {
    try {
      const fileManager = new FileManager();
      this.pricingData = await fileManager.loadPricing();
      this.initialized = true;
    } catch (error) {
      this.initializationError = error instanceof Error ? error.message : String(error);
      this.initialized = false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getInitializationError(): string | null {
    return this.initializationError;
  }

  calculateInteractionCost(interaction: InteractionFile): number {
    const pricing = this.pricingData[interaction.modelId];

    if (!pricing) {
      if (!this.initialized) {
        console.warn(`Cost calculation: pricing data not initialized. Model: ${interaction.modelId}`);
      } else {
        console.warn(`Cost calculation: pricing not found for model: ${interaction.modelId}`);
      }
      return 0;
    }

    const million = 1_000_000;
    const tokens = interaction.tokens;

    return (
      (tokens.input / million) * pricing.input +
      (tokens.output / million) * pricing.output +
      (tokens.cache_write / million) * (pricing.cacheWrite || 0) +
      (tokens.cache_read / million) * (pricing.cacheRead || 0)
    );
  }

  calculateSessionCost(session: SessionData): number {
    let total = 0;

    for (const file of session.files) {
      total += this.calculateInteractionCost(file);
    }

    return total;
  }

  async calculateSessionsCost(sessions: SessionData[]): Promise<number> {
    let total = 0;

    for (const session of sessions) {
      total += this.calculateSessionCost(session);
    }

    return total;
  }
}
