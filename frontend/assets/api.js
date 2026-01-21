export class API {
  constructor(apiBase = "/api") {
    this.apiBase = apiBase;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.apiBase}${endpoint}`, options);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Request failed");
      }
      return result;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Dashboard
  async getSummary() {
    return this.request("/summary");
  }

  // Sessions
  async getSessions(limit = 10, offset = 0) {
    return this.request(`/sessions?limit=${limit}&offset=${offset}`);
  }

  async getSession(sessionId, limit = 10, offset = 0) {
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
