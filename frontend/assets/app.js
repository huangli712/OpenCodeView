class OpenCodeView {
  constructor() {
    this.apiBase = "/api";
    this.ws = null;
    this.currentTab = "dashboard";
    this.currentData = null;
    this.refreshInterval = null;
    this.handlePaginationClick = async () => {};
    this.handleSessionCardClick = async () => {};
    this.handleMessagePaginationClick = async () => {};
    this.currentOffset = 0;
    this.currentLimit = 10;
    this.currentSessionId = null;
    this.currentMessageOffset = 0;
    this.currentMessageLimit = 10;

    this.setupEventListeners();
  }

  async init() {
    await this.loadDashboard();
    this.setupWebSocket();
    this.updateFooterTime();
    setInterval(() => this.updateFooterTime(), 1000);
    this.setupAboutModal();
  }

  updateFooterTime() {
    const footerTime = document.querySelector(".footer-time");
    if (footerTime) {
      footerTime.textContent = new Date().toLocaleString();
    }
  }

  setupEventListeners() {
    document.addEventListener("DOMContentLoaded", () => {
      this.init();
      this.setupAboutModal();
      this.setupPRTModal();
    });

    document.querySelectorAll("[data-tab]").forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(tab.dataset.tab || "dashboard");
      });
    });

    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });

    window.addEventListener("hashchange", () => {
      const hash = window.location.hash.slice(1) || "dashboard";
      this.switchTab(hash);
    });
  }

  setupAboutModal() {
    const aboutBtn = document.getElementById("about-btn");
    const modal = document.getElementById("about-modal");
    const closeBtn = modal?.querySelector(".modal-close");

    aboutBtn?.addEventListener("click", async () => {
      modal?.classList.add("active");
      await this.loadOpenCodeInfo();
    });

    closeBtn?.addEventListener("click", () => {
      modal?.classList.remove("active");
    });

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal?.classList.contains("active")) {
        modal.classList.remove("active");
      }
    });
  }

  setupPRTModal() {
    const modal = document.getElementById("prt-modal");
    const closeBtn = modal?.querySelector(".modal-close");

    closeBtn?.addEventListener("click", () => {
      modal?.classList.remove("active");
    });

    modal?.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal?.classList.contains("active")) {
        modal.classList.remove("active");
      }
    });
  }

  showPRTModal(prtData) {
    const modal = document.getElementById("prt-modal");
    const title = document.getElementById("prt-modal-title");
    const content = document.getElementById("prt-modal-content");

    if (!modal || !title || !content) return;

    title.textContent = prtData.id;

    const dataToShow = prtData.rawData || prtData;

    content.innerHTML = `
      <pre class="prt-modal-text-full">${JSON.stringify(dataToShow, null, 2)}</pre>
    `;

    modal.classList.add("active");
  }

  async loadOpenCodeInfo() {
    const content = document.getElementById("about-content");
    if (!content) return;

    try {
      const response = await fetch(`${this.apiBase}/opencode`);
      const result = await response.json();

      if (result.success) {
        content.innerHTML = this.renderOpenCodeInfo(result.data);
      } else {
        content.innerHTML = `<div class="error">Failed to load OpenCode information</div>`;
      }
    } catch (error) {
      content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
    }
  }

  renderOpenCodeInfo(data) {
    const path = (p) => `<div class="about-item"><label>Path</label><span>${p}</span></div>`;
    const count = (n, exists) => `<div class="about-item"><label>Count</label><span class="${exists ? 'exists' : 'not-exists'}">${n}</span></div>`;
    const status = (exists) => `<span class="${exists ? 'exists' : 'not-exists'}">${exists ? 'Yes' : 'No'}</span>`;

    let mcpHtml = "";
    if (data.mcp.exists) {
      mcpHtml = `
        <div class="about-grid">
          ${path(data.mcp.path)}
          ${count(data.mcp.serverCount, true)}
        </div>
        <div style="margin-top: 0.75rem;">
          <label style="font-size: 0.75rem; color: var(--text-light); text-transform: uppercase;">MCP Servers</label>
          <div style="margin-top: 0.5rem;">
            ${data.mcp.servers.length > 0
              ? data.mcp.servers.map(s => `<span class="mcp-server-tag">${s}</span>`).join("")
              : '<span class="not-exists">No MCP servers configured</span>'}
          </div>
        </div>
      `;
    } else {
      mcpHtml = `
        <div class="about-grid">
          ${path(data.mcp.path)}
        </div>
        <div style="margin-top: 0.5rem;">
          <span class="not-exists">MCP directory not found</span>
        </div>
      `;
    }

    return `
      <div class="about-section">
        <h3>ℹ️ About OpenCode</h3>
        <div class="about-grid">
          <div class="about-item">
            <label>Version</label>
            <span class="${data.version !== 'Unknown' ? 'exists' : 'not-exists'}">${data.version}</span>
          </div>
        </div>
      </div>

      <div class="about-section">
        <h3>📁 Storage</h3>
        <div class="about-grid">
          ${path(data.storagePath)}
          ${count(data.sessionCount, data.hasOpenCode)}
        </div>
        <div style="margin-top: 0.5rem;">
          <span class="${data.hasOpenCode ? 'exists' : 'not-exists'}">${data.hasOpenCode ? 'OpenCode data found' : 'No OpenCode data found'}</span>
        </div>
      </div>

      <div class="about-section">
        <h3>⚙️ Configuration</h3>
        <div class="about-grid">
          ${path(data.configPath)}
          ${status(data.hasOpenCode)}
        </div>
      </div>

      <div class="about-section">
        <h3>🔌 MCP Servers</h3>
        ${mcpHtml}
      </div>

      <div class="about-section">
        <h3>🧠 Skills</h3>
        <div class="about-grid">
          ${path(data.skills.path)}
          ${count(data.skills.count, data.skills.exists)}
        </div>
        <div style="margin-top: 0.5rem;">
          <span class="${data.skills.exists ? 'exists' : 'not-exists'}">${data.skills.count} skill${data.skills.count !== 1 ? 's' : ''} installed</span>
        </div>
      </div>

      <div class="about-section">
        <h3>🔌 Plugins</h3>
        <div class="about-grid">
          ${path(data.plugins.path)}
          ${count(data.plugins.count, data.plugins.exists)}
        </div>
        <div style="margin-top: 0.5rem;">
          <span class="${data.plugins.exists ? 'exists' : 'not-exists'}">${data.plugins.count} plugin${data.plugins.count !== 1 ? 's' : ''} installed</span>
        </div>
      </div>
    `;
  }

  async switchTab(tab) {
    if (this.currentTab === tab) return;

    this.currentTab = tab;

    document.querySelectorAll(".nav-link").forEach(el => {
      el.classList.remove("active");
      if (el.dataset.tab === tab) {
        el.classList.add("active");
      }
    });

    await this.loadTabContent(tab);
  }

  async loadTabContent(tab) {
    this.showLoading();

    try {
      switch (tab) {
        case "dashboard":
          await this.loadDashboard();
          break;
        case "sessions":
          await this.loadSessions();
          break;
        case "live":
          await this.loadLiveMonitor();
          break;
        case "daily":
          await this.loadAnalytics("daily");
          break;
        case "weekly":
          await this.loadAnalytics("weekly");
          break;
        case "models":
          await this.loadAnalytics("models");
          break;
        case "projects":
          await this.loadAnalytics("projects");
          break;
      }
    } catch (error) {
      this.showToast("LoadingFailed", error.message, "error");
    }
  }

  async loadDashboard() {
    const [summaryRes] = await Promise.all([
      fetch(`${this.apiBase}/summary`)
    ]);

    const summary = await summaryRes.json();

    if (summary.success) {
      this.renderDashboard(summary.data);
    } else {
      this.showToast("Loading Dashboard Failed", summary.error || "Unknown Error", "error");
    }
  }

  renderDashboard(summary) {
    const app = document.getElementById("app");

    app.innerHTML = `
      <div class="summary-cards">
        <div class="summary-card success">
          <div class="label">Total Sessions</div>
          <div class="value">${this.formatNumber(summary.totalSessions)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Interactions</div>
          <div class="value">${this.formatNumber(summary.totalInteractions)}</div>
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
          <div class="value">${this.formatNumber(summary.totalTokens.input)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Output Tokens</div>
          <div class="value">${this.formatNumber(summary.totalTokens.output)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Cache Write</div>
          <div class="value">${this.formatNumber(summary.totalTokens.cache_write)}</div>
        </div>
        <div class="summary-card">
          <div class="label">Cache Read</div>
          <div class="value">${this.formatNumber(summary.totalTokens.cache_read)}</div>
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
        <span>Built with OpenCodeView v0.4.1</span>
        <span class="footer-time">${new Date().toLocaleString()}</span>
      </footer>
    `;
  }

  async loadSessions(limit = 10, offset = 0) {
    this.currentOffset = offset;
    this.currentLimit = limit;

    const response = await fetch(`${this.apiBase}/sessions?limit=${limit}&offset=${offset}`);
    const result = await response.json();

    if (result.success) {
      this.renderSessions(result.data, result.pagination);
    } else {
      this.showToast("Loading Sessions Failed", result.error || "Unknown Error", "error");
    }
  }

  renderSessions(sessions, pagination) {
    const app = document.getElementById("app");

    if (sessions.length === 0) {
      app.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📭</div>
          <h3>No Sessions</h3>
          <p>Please verify your OpenCode storage path is correct</p>
        </div>
      `;
      return;
    }

    const { offset } = pagination;

    app.innerHTML = `
      <div class="session-list">
        ${sessions.map((session, index) => this.renderSessionCard(session, offset + index + 1)).join("")}
      </div>
      ${this.renderPagination(pagination)}
    `;

    this.setupPaginationEvents();
  }

  renderSessionCard(session, index) {
    const totalTokens = session.totalTokens?.total || 0;

    return `
      <div class="session-card" data-session-id="${session.sessionId}">
        <div class="session-header">
          <div class="session-title" style="display: flex; gap: 0;">${index} / ${this.truncate(session.sessionId, 50)}</div>
          <div class="session-meta">
            <span class="badge badge-secondary">${session.files.length} interactions</span>
            <span class="badge badge-secondary">$${session.totalCost?.toFixed(2)}</span>
          </div>
        </div>

        <div class="session-stats">
          <div class="stat-item">
            <div class="stat-label">Start Time</div>
            <div class="stat-value">${this.formatDate(new Date(session.startTime))}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Duration</div>
            <div class="stat-value">${this.formatDuration(session.durationHours)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Project</div>
            <div class="stat-value">${session.projectName || "Unknown"}</div>
          </div>
        </div>

        <div class="token-breakdown">
          <div class="token-bar">
            <div class="token-segment">
              <div class="token-segment-label">Input</div>
              <div class="token-segment-value">${this.formatNumber(session.totalTokens?.input || 0)}</div>
              <div class="token-segment-bar">
                <div class="token-segment-fill input" style="width: ${((session.totalTokens?.input || 0) / totalTokens * 100).toFixed(1)}%"></div>
              </div>
            </div>
            <div class="token-segment">
              <div class="token-segment-label">Output</div>
              <div class="token-segment-value">${this.formatNumber(session.totalTokens?.output || 0)}</div>
              <div class="token-segment-bar">
                <div class="token-segment-fill output" style="width: ${((session.totalTokens?.output || 0) / totalTokens * 100).toFixed(1)}%"></div>
              </div>
            </div>
            <div class="token-segment">
              <div class="token-segment-label">Cache</div>
              <div class="token-segment-value">${this.formatNumber((session.totalTokens?.cache_write || 0) + (session.totalTokens?.cache_read || 0))}</div>
              <div class="token-segment-bar">
                <div class="token-segment-fill cache" style="width: ${(((session.totalTokens?.cache_write || 0) + (session.totalTokens?.cache_read || 0)) / totalTokens * 100).toFixed(1)}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderPagination(pagination) {
    const { offset, limit, total, hasMore } = pagination;

    return `
      <div class="pagination">
        <span class="page-info">Showing ${offset + 1}-${Math.min(offset + limit, total)} of ${total}</span>
        <div class="pagination-buttons">
          ${offset > 0 ? `<button class="btn btn-secondary" data-offset="${offset - limit}">← Previous</button>` : ""}
          ${hasMore ? `<button class="btn btn-secondary" data-offset="${offset + limit}">Next →</button>` : ""}
        </div>
      </div>
    `;
  }

  renderMessagePagination(pagination) {
    const { offset, limit, total, hasMore } = pagination;

    return `
      <div class="pagination message-pagination">
        <span class="page-info">Showing ${offset + 1}-${Math.min(offset + limit, total)} of ${total}</span>
        <div class="pagination-buttons">
          ${offset > 0 ? `<button class="btn btn-secondary message-page-btn" data-message-offset="${offset - limit}">← Previous</button>` : ""}
          ${hasMore ? `<button class="btn btn-secondary message-page-btn" data-message-offset="${offset + limit}">Next →</button>` : ""}
        </div>
      </div>
    `;
  }

  async loadLiveMonitor() {
    const app = document.getElementById("app");

    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔌</div>
        <h3>Live Monitor暂not可用</h3>
        <p>Bun runtime当agoversionnotsupport WebSocket feature</p>
      </div>
    `;
  }

  renderLiveDashboard(data) {
    const app = document.getElementById("app");

    app.innerHTML = `
      <div class="live-dashboard">
        <div class="live-header">
          <div>
            <div class="live-title">${data.displayTitle}</div>
            <div class="session-meta">
              <span class="badge badge-secondary">${data.sessionId}</span>
            </div>
          </div>
          <div class="live-status">
            <div class="status-dot ${data.activityStatus}"></div>
            <div class="status-text">${this.getActivityStatusText(data.activityStatus)}</div>
          </div>
        </div>

        <div class="live-grid">
          <div class="live-card">
            <div class="live-card-label">Interactions</div>
            <div class="live-card-value">${this.formatNumber(data.interactionCount)}</div>
          </div>
          <div class="live-card">
            <div class="live-card-label">Total Tokens</div>
            <div class="live-card-value">${this.formatNumber(data.totalTokens)}</div>
          </div>
          <div class="live-card warning">
            <div class="live-card-label">Total Cost</div>
            <div class="live-card-value">$${data.totalCost.toFixed(2)}</div>
          </div>
          <div class="live-card">
            <div class="live-card-label">Duration</div>
            <div class="live-card-value">${this.formatDuration(data.durationHours)}</div>
          </div>
        </div>

        <div class="live-grid">
          <div class="live-card">
            <div class="live-card-label">Burn Rate</div>
            <div class="live-card-value">${data.burnRate.toFixed(1)} tokens/min</div>
          </div>
          <div class="live-card">
            <div class="live-card-label">Project</div>
            <div class="live-card-value">${data.projectName}</div>
          </div>
           <div class="live-card" style="grid-column: span 2;">
             <div class="live-card-label">Models Used</div>
             <div class="live-card-value" style="font-size: 1.25rem;">${data.modelsUsed.join(", ")}</div>
           </div>
        </div>
      </div>
    `;
  }

  async loadAnalytics(type) {
    const response = await fetch(`${this.apiBase}/analytics?type=${type}`);
    const result = await response.json();

    if (result.success) {
      this.renderAnalytics(result.data, type);
    } else {
      this.showToast(`Loading ${type} Analysis Failed`, result.error || "Unknown Error", "error");
    }
  }

  renderAnalytics(data, type) {
    const app = document.getElementById("app");

    const titles = {
      daily: "Daily Usage",
      weekly: "Weekly Usage",
      models: "Models Analysis",
      projects: "Projects Analysis"
    };

    app.innerHTML = `
      <h2 class="section-title">${titles[type] || "Analysis"}</h2>
      ${this.renderAnalyticsTable(data, type)}
    `;

    this.setupPaginationEvents();
  }

  renderAnalyticsTable(data, type) {
    if (type === "daily" || type === "weekly" || type === "monthly") {
      return `
        <table class="data-table">
          <thead>
            <tr>
              <th>${type === "daily" ? "Date" : type === "weekly" ? "Week" : "Month"}</th>
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
                <td>${this.formatNumber(row.sessions)}</td>
                <td>${this.formatNumber(row.interactions)}</td>
                <td>${this.formatNumber(row.tokens)}</td>
                <td>$${row.cost.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (type === "models") {
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
                <td>${this.formatNumber(row.sessions)}</td>
                <td>${this.formatNumber(row.interactions)}</td>
                <td>${this.formatNumber(row.tokens)}</td>
                <td>$${row.cost.toFixed(2)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } else if (type === "projects") {
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
                <td>${this.formatNumber(row.sessions)}</td>
                <td>${this.formatNumber(row.interactions)}</td>
                <td>${this.formatNumber(row.tokens)}</td>
                <td>$${row.cost.toFixed(2)}</td>
                <td><div class="models-mini">${row.modelsUsed.slice(0, 2).join(", ")}${row.modelsUsed.length > 2 ? "..." : ""}</div></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }

     return "";
   }

   setupWebSocket() {
    console.log("WebSocket disabled - Bun runtime does not fully support WebSocket");
  }

   updateLiveIndicator(connected) {
    const indicator = document.querySelector(".live-indicator");
    if (indicator) {
      if (connected) {
        indicator.style.background = "var(--success)";
        indicator.style.animation = "pulse 2s infinite";
      } else {
        indicator.style.background = "var(--text-light)";
        indicator.style.animation = "none";
      }
    }
  }

  showLoading() {
    const app = document.getElementById("app");

    app.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading中...</p>
      </div>
    `;
  }

  showToast(message, detail, type = "success") {
    const container = document.getElementById("toast-container");

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-message">
        <strong>${message}</strong>
        ${detail ? `<br>${detail}` : ""}
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 5000);
  }

  setupPaginationEvents() {
    document.removeEventListener("click", this.handlePaginationClick);
    document.removeEventListener("click", this.handleSessionCardClick);

    this.handlePaginationClick = async (e) => {
      const target = e.target;

      if (target.classList.contains("btn") && target.dataset.offset) {
        e.preventDefault();
        const offset = parseInt(target.dataset.offset);
        await this.loadSessions(this.currentLimit, offset);
      }
    };

    this.handleSessionCardClick = async (e) => {
      const target = e.target;
      const sessionCard = target.closest(".session-card");

      if (sessionCard && sessionCard.dataset.sessionId) {
        e.preventDefault();
        const sessionId = sessionCard.dataset.sessionId;
        await this.loadSessionDetails(sessionId);
      }
    };

    document.addEventListener("click", this.handlePaginationClick);
    document.addEventListener("click", this.handleSessionCardClick);
  }

  setupMessagePaginationEvents() {
    document.removeEventListener("click", this.handleMessagePaginationClick);

    this.handleMessagePaginationClick = async (e) => {
      const target = e.target;

      if (target.classList.contains("message-page-btn")) {
        e.preventDefault();
        const offset = parseInt(target.dataset.messageOffset);
        await this.loadMessages(this.currentMessageLimit, offset);
      }
    };

    document.addEventListener("click", this.handleMessagePaginationClick);
  }

  handlePaginationClick = async (e) => {};
  handleSessionCardClick = async (e) => {};
  handleMessagePaginationClick = async (e) => {};

  async loadSessionDetails(sessionId) {
    this.currentSessionId = sessionId;
    this.currentMessageOffset = 0;
    await this.loadMessages(10, 0);
  }

  async loadMessages(limit, offset) {
    this.currentMessageLimit = limit;
    this.currentMessageOffset = offset;

    try {
      const response = await fetch(`${this.apiBase}/sessions/${this.currentSessionId}?limit=${limit}&offset=${offset}`);
      const result = await response.json();

      if (result.success) {
        const app = document.getElementById("app");
        app.innerHTML = `
          <button id="back-to-list-button" class="btn btn-secondary back-to-list">← Back to List</button>
          ${this.renderSessionDetails(result.data)}
          ${this.renderMessagePagination(result.pagination)}
        `;

        document.getElementById("back-to-list-button").onclick = async () => {
          await this.loadSessions(this.currentLimit, this.currentOffset);
        };

        this.setupMessagePaginationEvents();

        console.log('Total messages:', result.data.messages?.length);

        // Load PRT files for each message
        const messageCards = document.querySelectorAll('.message-card');
        for (const card of messageCards) {
          const messageId = card.querySelector('.message-id')?.textContent.replace('ID: ', '');
          if (messageId) {
            const messageData = result.data.messages?.find(m => m.id === messageId);
            if (messageData) {
              console.log(`Found message ${messageId}, has prtFiles:`, !!messageData.prtFiles);
              this.updatePRTFilesDisplay(messageData, card);
            } else {
              console.warn(`Message data not found for ${messageId}`);
            }
          }
        }
      } else {
        this.showToast("Loading Session Details Failed", result.error || "Unknown Error", "error");
      }
    } catch (error) {
      this.showToast("LoadingFailed", error.message, "error");
    }
  }

  renderSessionDetails(session) {
    return `
      <div class="session-details">
        <h2 class="section-title">${session.sessionId}</h2>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="label">Interactions</div>
            <div class="value">${this.formatNumber(session.interactionCount)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Cost</div>
            <div class="value-small">$${session.totalCost.toFixed(2)}</div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="label">Duration</div>
            <div class="value">${this.formatDuration(session.durationHours)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Project</div>
            <div class="value">${session.projectName || "Unknown"}</div>
          </div>
        </div>

        <h3 class="section-title" style="margin-top: 2rem;">Models Used</h3>
        <div class="models-grid">
          ${session.modelsUsed.map(model => `
            <div class="model-card">
              <span class="model-icon">🤖</span>
              <span class="model-name">${model}</span>
            </div>
          `).join("")}
        </div>

        <h3 class="section-title" style="margin-top: 2rem;">Messages</h3>
        <div class="messages-list">
          ${session.messages ? this.renderMessages(session.messages) : '<div class="empty-state">No messages available</div>'}
        </div>
      </div>
    `;
  }

  renderMessages(messages) {
    return messages.map((msg, index) => `
      <div class="message-card ${msg.role}">
        <div class="message-header">
          <div class="message-role">
            <span class="role-icon">${msg.role === 'user' ? '👤' : '🤖'}</span>
            <span class="role-text">${this.formatRole(msg.role)}</span>
          </div>
          <div class="message-meta">
            <span class="message-id">ID: ${msg.id}</span>
            ${msg.timestamp ? `<span class="message-time">${this.formatTimestamp(msg.timestamp)}</span>` : ''}
          </div>
        </div>

        <div class="message-info-grid">
          ${msg.mode ? `<div class="message-info-item"><span class="info-label">Mode:</span><span class="info-value">${msg.mode}</span></div>` : ''}
          ${msg.agent ? `<div class="message-info-item"><span class="info-label">Agent:</span><span class="info-value">${msg.agent}</span></div>` : ''}
          ${msg.providerID ? `<div class="message-info-item"><span class="info-label">Provider:</span><span class="info-value">${msg.providerID}</span></div>` : ''}
          ${msg.modelId ? `<div class="message-info-item"><span class="info-label">Model:</span><span class="info-value">${msg.modelId}</span></div>` : ''}
          <div class="message-info-item"><span class="info-label">Tokens:</span><span class="info-value">${this.formatNumber(msg.tokens || 0)}</span></div>
          ${msg.cost !== undefined && msg.cost !== null ? `<div class="message-info-item"><span class="info-label">Cost:</span><span class="info-value">$${msg.cost.toFixed(2)}</span></div>` : ''}
         </div>

         <div class="prt-files-section">
           <div class="prt-files-header">
             <span class="prt-files-title">PRT Files</span>
             <span class="prt-files-count" id="prt-count-${msg.id}">0 files</span>
           </div>
           <div class="prt-files-content" id="prt-content-${msg.id}">
             <div class="loading"><div class="spinner"></div><p>Loading...</p></div>
           </div>
         </div>

         ${msg.title ? `
           <div class="message-content">
             <div class="message-title">${this.escapeHtml(msg.title)}</div>
             ${msg.fileCount ? `<div class="message-files">${msg.fileCount} file(s) modified</div>` : ''}
             ${msg.diffCount ? `<div class="message-diffs">${this.formatNumber(msg.diffCount)} line changes</div>` : ''}
           </div>
         ` : ''}
       </div>
     `).join('');
   }

     updatePRTFilesDisplay(messageData, cardElement) {
     const messageId = messageData.id;
     const countSpan = cardElement.querySelector(`#prt-count-${messageId}`);
     const contentDiv = cardElement.querySelector(`#prt-content-${messageId}`);

     if (countSpan) {
       if (messageData.prtFiles && messageData.prtFiles.length > 0) {
         countSpan.textContent = `${messageData.prtFiles.length} file${messageData.prtFiles.length > 1 ? 's' : ''}`;
       } else {
         countSpan.textContent = '0 files';
       }
     }

     if (contentDiv) {
       if (messageData.prtFiles && messageData.prtFiles.length > 0) {
         contentDiv.innerHTML = messageData.prtFiles.map(prt => {
           let typeStr = 'unknown';

           if (prt.type !== null && prt.type !== undefined) {
             if (typeof prt.type === 'string') {
               typeStr = prt.type.length > 50 ? prt.type.substring(0, 50) + '...' : prt.type;
             } else if (typeof prt.type === 'object') {
               typeStr = JSON.stringify(prt.type);
             } else {
               typeStr = String(prt.type);
             }
           }

           return `
           <div class="prt-file-item" data-prt-id="${prt.id}">
              <span class="prt-file-type" title="${this.escapeHtml(String(prt.type))}">${this.escapeHtml(typeStr)}</span>
              <span class="prt-file-id">${prt.id}</span>
            </div>
          `;
         }).join('');

         // Add click event listeners to PRT type elements
         contentDiv.querySelectorAll('.prt-file-type').forEach(typeEl => {
           typeEl.addEventListener('click', (e) => {
             e.stopPropagation();
             const prtId = typeEl.closest('.prt-file-item')?.dataset.prtId;
             if (prtId) {
               const prtData = messageData.prtFiles.find(p => p.id === prtId);
               if (prtData) {
                 this.showPRTModal(prtData);
               }
             }
           });
         });
       } else {
         contentDiv.innerHTML = '<div class="prt-empty">No PRT files</div>';
       }
     }
   }

   formatRole(role) {
    const roleMap = {
      'user': 'User',
      'assistant': 'Assistant',
      'system': 'System'
    };
    return roleMap[role] || role;
  }

  formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatNumber(num) {
    return new Intl.NumberFormat("zh-CN").format(num);
  }

  formatDate(date) {
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  formatDuration(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0 && m === 0) {
      return "0 minutes";
    }

    const parts = [];
    if (h > 0) parts.push(`${h} hours`);
    if (m > 0) parts.push(`${m} minutes`);

    return parts.join(" ");
  }

  truncate(str, length) {
    if (str.length <= length) return str;
    return str.slice(0, length - 3) + "...";
  }

  getActivityStatusText(status) {
    const statusMap = {
      active: "Active",
      recent: "Recent",
      idle: "Idle",
      inactive: "notActive"
    };
    return statusMap[status] || status;
  }

  cleanup() {
    if (this.ws) {
      this.ws.close();
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}

const view = new OpenCodeView();
export default view;
