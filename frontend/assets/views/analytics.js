import { formatNumber } from "../utils/formatters.js";
import { ChartsComponent } from "../components/charts.js";

export class AnalyticsView {
  constructor(api) {
    this.api = api;
    this.charts = new ChartsComponent();
  }

  async load(type) {
    const result = await this.api.getAnalytics(type);
    const titles = {
      daily: "Daily Usage",
      weekly: "Weekly Usage",
      monthly: "Monthly Usage",
      models: "Models Analysis",
      projects: "Projects Analysis"
    };

    return {
      html: `
        <h2 class="section-title">${titles[type] || "Analysis"}</h2>
        ${this.renderTable(result.data, type)}
        ${this.renderChartsContainer(type)}
      `,
      data: result.data,
      type
    };
  }

  renderTable(data, type) {
    if (["daily", "weekly", "monthly"].includes(type)) {
      return this.renderTimeTable(data, type);
    } else if (type === "models") {
      return this.renderModelsTable(data);
    } else if (type === "projects") {
      return this.renderProjectsTable(data);
    }
    return "";
  }

  renderTimeTable(data, type) {
    const label = type === "daily" ? "Date" : type === "weekly" ? "Week" : "Month";
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>${label}</th>
            <th>Sessions</th>
            <th>Interactions</th>
            <th>Total Tokens</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td>${row.date || row.week || row.month}</td>
              <td>${formatNumber(row.sessions)}</td>
              <td>${formatNumber(row.interactions)}</td>
              <td>${formatNumber(row.tokens)}</td>
              <td>$${row.cost.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderModelsTable(data) {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>Sessions</th>
            <th>Interactions</th>
            <th>Total Tokens</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td><span class="model-tag">${row.modelId}</span></td>
              <td>${formatNumber(row.sessions)}</td>
              <td>${formatNumber(row.interactions)}</td>
              <td>${formatNumber(row.tokens)}</td>
              <td>$${row.cost.toFixed(2)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderProjectsTable(data) {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th>Project</th>
            <th>Sessions</th>
            <th>Interactions</th>
            <th>Total Tokens</th>
            <th>Cost</th>
            <th>Models</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              <td><strong>${row.projectName}</strong></td>
              <td>${formatNumber(row.sessions)}</td>
              <td>${formatNumber(row.interactions)}</td>
              <td>${formatNumber(row.tokens)}</td>
              <td>$${row.cost.toFixed(2)}</td>
              <td><div class="models-mini">${row.modelsUsed.slice(0, 2).join(", ")}${row.modelsUsed.length > 2 ? "..." : ""}</div></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  renderChartsContainer(type) {
    if (["daily", "weekly", "monthly"].includes(type)) {
      return `
        <div class="charts-container">
          <div class="chart-card">
            <canvas id="costChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="tokensChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="sessionsChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="interactionsChart"></canvas>
          </div>
        </div>
      `;
    } else if (type === "models") {
      return `
        <div class="charts-container">
          <div class="chart-card">
            <canvas id="modelCostChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="modelTokensChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="modelSessionsChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="modelInteractionsChart"></canvas>
          </div>
        </div>
      `;
    } else if (type === "projects") {
      return `
        <div class="charts-container">
          <div class="chart-card">
            <canvas id="projectCostChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="projectTokensChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="projectSessionsChart"></canvas>
          </div>
          <div class="chart-card">
            <canvas id="projectInteractionsChart"></canvas>
          </div>
        </div>
      `;
    }
    return "";
  }

  renderCharts(data, type) {
    if (["daily", "weekly", "monthly"].includes(type)) {
      this.charts.createTimeCharts(data);
    } else if (type === "models") {
      this.charts.createModelsCharts(data);
    } else if (type === "projects") {
      this.charts.createProjectsCharts(data);
    }
  }
}
