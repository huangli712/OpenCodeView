import { config } from "./config.js";

export class APIError extends Error {
  constructor(message, statusCode, endpoint, type = "UNKNOWN") {
    super(message);
    this.name = "APIError";
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.type = type;
  }
}

export class API {
  constructor(apiBase = config.api.baseUrl) {
    this.apiBase = apiBase;
  }

  async request(endpoint, options = {}, retries = 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.api.timeout);

    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorMessage = config.isDev
          ? `HTTP ${response.status}: ${response.statusText}`
          : "An error occurred. Please try again.";
        throw new APIError(errorMessage, response.status, endpoint, "HTTP_ERROR");
      }

      const result = await response.json();

      if (!result.success) {
        const errorMessage = config.isDev
          ? result.error || "Request failed"
          : "An error occurred. Please try again.";
        throw new APIError(errorMessage, response.status, endpoint, "API_ERROR");
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new APIError(
          `Request timeout after ${config.api.timeout}ms`,
          408,
          endpoint,
          "TIMEOUT"
        );
      }

      if (error instanceof APIError) {
        if (this.shouldRetry(error, retries)) {
          await this.delay(config.api.retryDelay * (retries + 1));
          return this.request(endpoint, options, retries + 1);
        }
        throw error;
      }

      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new APIError(
          "Network error. Please check your connection.",
          0,
          endpoint,
          "NETWORK_ERROR"
        );
      }

      if (config.isDev) {
        console.error(`API Error [${endpoint}]:`, error);
      }

      const errorMessage = config.isDev
        ? error.message || "Unknown error occurred"
        : "An error occurred. Please try again.";
      throw new APIError(errorMessage, 0, endpoint, "UNKNOWN");
    }
  }

  shouldRetry(error, retries) {
    if (retries >= config.api.maxRetries) {
      return false;
    }

    if (!config.api.retryableStatuses.includes(error.statusCode)) {
      return false;
    }

    return true;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Dashboard
  async getSummary() {
    return this.request("/summary");
  }

  // Sessions
  async getSessions(limit = config.pagination.defaultLimit, offset = 0) {
    return this.request(`/sessions?limit=${limit}&offset=${offset}`);
  }

  async getSession(sessionId, limit = config.pagination.defaultLimit, offset = 0) {
    return this.request(`/sessions/${sessionId}?limit=${limit}&offset=${offset}`);
  }

  // Analytics
  async getAnalytics(type) {
    return this.request(`/analytics?type=${type}`);
  }

  // About
  async getOpenCodeInfo() {
    return this.request("/opencode");
  }
}
