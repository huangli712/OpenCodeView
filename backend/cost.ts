import type { TokenUsage, InteractionFile, SessionData, PricingData } from "./types";
import { FileManager } from "./fileutil";

export class CostCalculator {
  private pricingData: PricingData;
  private initialized: boolean = false;
  private initializationError: string | null = null;

  private sessionCostCache: Map<string, number>;
  private readonly CACHE_MAX_SIZE = 1000;

  constructor() {
    this.pricingData = {};
    this.sessionCostCache = new Map();
  }

  // Load pricing configuration
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

  // Check if pricing data is loaded
  isInitialized(): boolean {
    return this.initialized;
  }

  // Get initialization error message
  getInitializationError(): string | null {
    return this.initializationError;
  }

  // Calculate cost for a single interaction
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

    // Pricing is per 1M tokens
    const million = 1_000_000;
    const tokens = interaction.tokens;

    return (
      (tokens.input / million) * pricing.input +
      (tokens.output / million) * pricing.output +
      (tokens.cache_write / million) * (pricing.cacheWrite || 0) +
      (tokens.cache_read / million) * (pricing.cacheRead || 0)
    );
  }

  // Calculate session cost with caching
  calculateSessionCost(session: SessionData): number {
    if (this.sessionCostCache.has(session.sessionId)) {
      return this.sessionCostCache.get(session.sessionId)!;
    }

    let total = 0;

    for (const file of session.files) {
      total += this.calculateInteractionCost(file);
    }

    if (this.sessionCostCache.size >= this.CACHE_MAX_SIZE) {
      const firstKey = this.sessionCostCache.keys().next().value;
      this.sessionCostCache.delete(firstKey);
    }

    this.sessionCostCache.set(session.sessionId, total);

    return total;
  }

  // Clear session cost cache
  clearCache(): void {
    this.sessionCostCache.clear();
  }

  // Calculate total cost for multiple sessions
  async calculateSessionsCost(sessions: SessionData[]): Promise<number> {
    let total = 0;

    for (const session of sessions) {
      total += this.calculateSessionCost(session);
    }

    return total;
  }
}
