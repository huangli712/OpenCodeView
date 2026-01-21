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
            color: "rgba(0, 0, 0, 0.05)"
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

    this.createChart("costChart", "bar", labels, data.map(r => r.cost),
      { label: "Cost ($)", color: "rgba(59, 130, 246, 0.8)", title: "Cost Over Time" });

    this.createChart("tokensChart", "bar", labels, data.map(r => r.tokens),
      { label: "Tokens", color: "rgba(16, 185, 129, 0.8)", title: "Tokens Over Time", useExponential: true });

    this.createChart("sessionsChart", "bar", labels, data.map(r => r.sessions),
      { label: "Sessions", color: "rgba(245, 158, 11, 0.8)", title: "Sessions Over Time" });

    this.createChart("interactionsChart", "bar", labels, data.map(r => r.interactions),
      { label: "Interactions", color: "rgba(139, 92, 246, 0.8)", title: "Interactions Over Time" });
  }

  createModelsCharts(data) {
    const labels = data.map(r => r.modelId);

    this.createChart("modelCostChart", "bar", labels, data.map(r => r.cost),
      { label: "Cost ($)", color: "rgba(59, 130, 246, 0.8)", title: "Cost by Model" });

    this.createChart("modelTokensChart", "bar", labels, data.map(r => r.tokens),
      { label: "Tokens", color: "rgba(16, 185, 129, 0.8)", title: "Tokens by Model", useExponential: true });

    this.createChart("modelSessionsChart", "bar", labels, data.map(r => r.sessions),
      { label: "Sessions", color: "rgba(245, 158, 11, 0.8)", title: "Sessions by Model" });

    this.createChart("modelInteractionsChart", "bar", labels, data.map(r => r.interactions),
      { label: "Interactions", color: "rgba(139, 92, 246, 0.8)", title: "Interactions by Model" });
  }

  createProjectsCharts(data) {
    const labels = data.map(r => r.projectName);

    this.createChart("projectCostChart", "bar", labels, data.map(r => r.cost),
      { label: "Cost ($)", color: "rgba(59, 130, 246, 0.8)", title: "Cost by Project" });

    this.createChart("projectTokensChart", "bar", labels, data.map(r => r.tokens),
      { label: "Tokens", color: "rgba(16, 185, 129, 0.8)", title: "Tokens by Project", useExponential: true });

    this.createChart("projectSessionsChart", "bar", labels, data.map(r => r.sessions),
      { label: "Sessions", color: "rgba(245, 158, 11, 0.8)", title: "Sessions by Project" });

    this.createChart("projectInteractionsChart", "bar", labels, data.map(r => r.interactions),
      { label: "Interactions", color: "rgba(139, 92, 246, 0.8)", title: "Interactions by Project" });
  }

  createChart(canvasId, type, labels, data, { label, color, title, useExponential = false }) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const existing = this.chartInstances.get(canvasId);
    if (existing) existing.destroy();

    const options = {
      ...this.getBaseOptions(),
      plugins: {
        ...this.getBaseOptions().plugins,
        title: {
          display: true,
          text: title,
          font: { size: 16, weight: "600" }
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
              if (value >= 10000) {
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
          borderColor: color.replace("0.8", "1"),
          borderWidth: 1,
          borderRadius: 4
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
