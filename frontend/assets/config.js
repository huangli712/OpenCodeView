export const config = {
  pagination: {
    defaultLimit: 10
  },

  charts: {
    exponentialThreshold: 10000,
    defaultType: "bar",
    colors: {
      cost: "rgba(59, 130, 246, 0.8)",
      tokens: "rgba(16, 185, 129, 0.8)",
      sessions: "rgba(245, 158, 11, 0.8)",
      interactions: "rgba(139, 92, 246, 0.8)",
      grid: "rgba(0, 0, 0, 0.05)"
    },
    labels: {
      cost: "Cost ($)",
      tokens: "Tokens",
      sessions: "Sessions",
      interactions: "Interactions"
    },
    titles: {
      time: {
        cost: "Cost Over Time",
        tokens: "Tokens Over Time",
        sessions: "Sessions Over Time",
        interactions: "Interactions Over Time"
      },
      models: {
        cost: "Cost by Model",
        tokens: "Tokens by Model",
        sessions: "Sessions by Model",
        interactions: "Interactions by Model"
      },
      projects: {
        cost: "Cost by Project",
        tokens: "Tokens by Project",
        sessions: "Sessions by Project",
        interactions: "Interactions by Project"
      }
    },
    style: {
      borderWidth: 1,
      borderRadius: 4,
      titleFont: { size: 16, weight: "600" },
      alphaOpaque: "1"
    }
  },

  api: {
    baseUrl: "/api",
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    retryableStatuses: [408, 429, 500, 502, 503, 504]
  },

  ui: {
    toastDuration: 5000,
    updateInterval: 1000
  },

  display: {
    maxIdLength: 50,
    maxTypeLength: 50,
    defaultLocale: "en-US"
  }
};

export default config;
