import { config } from "../config.js";

export class ChartsComponent {
  constructor() {
    this.chartInstances = new Map();
  }

  getBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: config.charts.colors.grid
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    };
  }

  createTimeCharts(data) {
    const labels = data.map(r => r.date || r.week || r.month);
    const { labels: chartLabels, titles, colors, style } = config.charts;

    this.createChart("costChart", config.charts.defaultType, labels, data.map(r => r.cost),
      { label: chartLabels.cost, color: colors.cost, title: titles.time.cost });

    this.createChart("tokensChart", config.charts.defaultType, labels, data.map(r => r.tokens),
      { label: chartLabels.tokens, color: colors.tokens, title: titles.time.tokens, useExponential: true });

    this.createChart("sessionsChart", config.charts.defaultType, labels, data.map(r => r.sessions),
      { label: chartLabels.sessions, color: colors.sessions, title: titles.time.sessions });

    this.createChart("interactionsChart", config.charts.defaultType, labels, data.map(r => r.interactions),
      { label: chartLabels.interactions, color: colors.interactions, title: titles.time.interactions });
  }

  createModelsCharts(data) {
    const labels = data.map(r => r.modelId);
    const { labels: chartLabels, titles, colors } = config.charts;

    this.createChart("modelCostChart", config.charts.defaultType, labels, data.map(r => r.cost),
      { label: chartLabels.cost, color: colors.cost, title: titles.models.cost });

    this.createChart("modelTokensChart", config.charts.defaultType, labels, data.map(r => r.tokens),
      { label: chartLabels.tokens, color: colors.tokens, title: titles.models.tokens, useExponential: true });

    this.createChart("modelSessionsChart", config.charts.defaultType, labels, data.map(r => r.sessions),
      { label: chartLabels.sessions, color: colors.sessions, title: titles.models.sessions });

    this.createChart("modelInteractionsChart", config.charts.defaultType, labels, data.map(r => r.interactions),
      { label: chartLabels.interactions, color: colors.interactions, title: titles.models.interactions });
  }

  createProjectsCharts(data) {
    const labels = data.map(r => r.projectName);
    const { labels: chartLabels, titles, colors } = config.charts;

    this.createChart("projectCostChart", config.charts.defaultType, labels, data.map(r => r.cost),
      { label: chartLabels.cost, color: colors.cost, title: titles.projects.cost });

    this.createChart("projectTokensChart", config.charts.defaultType, labels, data.map(r => r.tokens),
      { label: chartLabels.tokens, color: colors.tokens, title: titles.projects.tokens, useExponential: true });

    this.createChart("projectSessionsChart", config.charts.defaultType, labels, data.map(r => r.sessions),
      { label: chartLabels.sessions, color: colors.sessions, title: titles.projects.sessions });

    this.createChart("projectInteractionsChart", config.charts.defaultType, labels, data.map(r => r.interactions),
      { label: chartLabels.interactions, color: colors.interactions, title: titles.projects.interactions });
  }

  createChart(canvasId, type, labels, data, { label, color, title, useExponential = false }) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existing = this.chartInstances.get(canvasId);
    if (existing) existing.destroy();

    const { style } = config.charts;

    const options = {
      ...this.getBaseOptions(),
      plugins: {
        ...this.getBaseOptions().plugins,
        title: {
          display: true,
          text: title,
          font: style.titleFont
        }
      }
    };

    if (useExponential) {
      options.scales = {
        ...options.scales,
        y: {
          ...options.scales.y,
          ticks: {
            callback: function(value) {
              if (value >= config.charts.exponentialThreshold) {
                return value.toExponential(1);
              }
              return value;
            }
          }
        }
      };
    } else {
      options.scales = {
        ...options.scales,
        y: {
          ...options.scales.y,
          ticks: {
            precision: 0
          }
        }
      };
    }

    const chart = new window.Chart(canvas, {
      type,
      data: {
        labels,
        datasets: [{
          label,
          data,
          backgroundColor: color,
          borderColor: color.replace("0.8", style.alphaOpaque),
          borderWidth: style.borderWidth,
          borderRadius: style.borderRadius
        }]
      },
      options
    });

    this.chartInstances.set(canvasId, chart);
  }

  destroyAll() {
    this.chartInstances.forEach(chart => chart.destroy());
    this.chartInstances.clear();
  }
}
