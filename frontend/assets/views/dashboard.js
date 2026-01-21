import { formatNumber } from "../utils/formatters.js";

export class DashboardView {
  constructor(api) {
    this.api = api;
  }

  async load() {
    const result = await this.api.getSummary();
    return this.render(result.data);
  }

  render(summary) {
    return `
      <div class="summary-cards">
        <div class="summary-card success">
          <div class="label">Total Sessions</div>
          <div class="value">${formatNumber(summary.totalSessions)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Interactions</div>
          <div class="value">${formatNumber(summary.totalInteractions)}</div>
        </div>
        <div class="summary-card warning">
          <div class="label">Total Cost</div>
          <div class="value-small">$${summary.totalCost.toFixed(2)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Date Range</div>
          <div class="value-small">${summary.dateRange}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="summary-card">
          <div class="label">Input Tokens</div>
          <div class="value">${formatNumber(summary.totalTokens.input)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Output Tokens</div>
          <div class="value">${formatNumber(summary.totalTokens.output)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Cache Write</div>
          <div class="value">${formatNumber(summary.totalTokens.cache_write)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Cache Read</div>
          <div class="value">${formatNumber(summary.totalTokens.cache_read)}</div>
        </div>
      </div>

      <div class="models-section">
        <h3 class="section-title">Models Used</h3>
        <div class="models-grid">
          ${summary.modelsUsed.map(model => `
            <div class="model-card">
              <span class="model-icon">🤖</span>
              <span class="model-name">${model}</span>
            </div>
          `).join("")}
        </div>
      </div>

      <footer class="app-footer">
        <span>Built with OpenCodeView v0.6.0</span>
        <span class="footer-time">${new Date().toLocaleString("en-US")}</span>
      </footer>
    `;
  }
}
