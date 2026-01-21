import { formatNumber, formatDate, formatDuration, truncate, escapeHtml, formatRole, formatTimestamp } from "../utils/formatters.js";
import { PaginationComponent } from "../components/pagination.js";
import { config } from "../config.js";

export class SessionsView {
  constructor(api) {
    this.api = api;
    this.pagination = new PaginationComponent();
  }

  async loadList(limit, offset) {
    const result = await this.api.getSessions(limit, offset);
    return {
      html: this.renderList(result.data, result.pagination),
      pagination: result.pagination
    };
  }

  async loadDetails(sessionId, limit, offset) {
    const result = await this.api.getSession(sessionId, limit, offset);
    return {
      html: this.renderDetails(result.data) +
            this.pagination.render(result.pagination, "message"),
      pagination: result.pagination,
      messages: result.data.messages
    };
  }

  renderList(sessions, pagination) {
    if (sessions.length === 0) {
      return this.renderEmptyState();
    }
    return `
      <div class="session-list">
        ${sessions.map((s, i) => this.renderSessionCard(s, pagination.offset + i + 1)).join("")}
      </div>
      ${this.pagination.render(pagination)}
    `;
  }

  renderSessionCard(session, index) {
    const totalTokens = session.totalTokens?.total || 0;
    return `
      <div class="session-card" data-session-id="${session.sessionId}">
        ${this.renderSessionHeader(session, index)}
        ${this.renderSessionStats(session)}
        ${this.renderTokenBreakdown(session, totalTokens)}
      </div>
    `;
  }

  renderSessionHeader(session, index) {
    return `
      <div class="session-header">
        <div class="session-title-flex">${index} / ${truncate(session.sessionId)}</div>
        <div class="session-meta">
          <span class="badge badge-secondary">${session.files.length} interactions</span>
          <span class="badge badge-secondary">$${session.totalCost?.toFixed(2)}</span>
        </div>
      </div>
    `;
  }

  renderSessionStats(session) {
    return `
      <div class="session-stats">
        <div class="stat-item">
          <div class="stat-label">Start Time</div>
          <div class="stat-value">${formatDate(new Date(session.startTime))}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Duration</div>
          <div class="stat-value">${formatDuration(session.durationHours)}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Project</div>
          <div class="stat-value">${session.projectName || "Unknown"}</div>
        </div>
      </div>
    `;
  }

  renderTokenBreakdown(session, totalTokens) {
    return `
      <div class="token-breakdown">
        <div class="token-bar">
          ${this.renderTokenSegment("Input", session.totalTokens?.input || 0, totalTokens, "input")}
          ${this.renderTokenSegment("Output", session.totalTokens?.output || 0, totalTokens, "output")}
          ${this.renderTokenSegment("Cache",
            (session.totalTokens?.cache_write || 0) + (session.totalTokens?.cache_read || 0),
            totalTokens,
            "cache")}
        </div>
      </div>
    `;
  }

  renderTokenSegment(label, value, total, type) {
    const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
    return `
      <div class="token-segment">
        <div class="token-segment-label">${label}</div>
        <div class="token-segment-value">${formatNumber(value)}</div>
        <div class="token-segment-bar">
          <div class="token-segment-fill ${type}" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }

  renderDetails(session) {
    return `
      <button id="back-to-list-button" class="btn btn-secondary back-to-list">← Back to List</button>
      <div class="session-details">
        <h2 class="section-title">${session.sessionId}</h2>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="label">Interactions</div>
            <div class="value">${formatNumber(session.interactionCount)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Cost</div>
            <div class="value-small">$${session.totalCost.toFixed(2)}</div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card">
            <div class="label">Duration</div>
            <div class="value">${formatDuration(session.durationHours)}</div>
          </div>
          <div class="summary-card">
            <div class="label">Project</div>
            <div class="value">${session.projectName || "Unknown"}</div>
          </div>
        </div>

        <h3 class="section-title-spacing">Models Used</h3>
        <div class="models-grid">
          ${session.modelsUsed.map(model => `
            <div class="model-card">
              <span class="model-icon">🤖</span>
              <span class="model-name">${model}</span>
            </div>
          `).join("")}
        </div>

        <h3 class="section-title-spacing">Messages</h3>
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
            <span class="role-icon">${msg.role === "user" ? "👤" : "🤖"}</span>
            <span class="role-text">${formatRole(msg.role)}</span>
          </div>
          <div class="message-meta">
            <span class="message-id">ID: ${msg.id}</span>
            ${msg.timestamp ? `<span class="message-time">${formatTimestamp(msg.timestamp)}</span>` : ""}
          </div>
        </div>

        <div class="message-info-grid">
          ${msg.mode ? `<div class="message-info-item"><span class="info-label">Mode:</span><span class="info-value">${msg.mode}</span></div>` : ""}
          ${msg.agent ? `<div class="message-info-item"><span class="info-label">Agent:</span><span class="info-value">${msg.agent}</span></div>` : ""}
          ${msg.providerID ? `<div class="message-info-item"><span class="info-label">Provider:</span><span class="info-value">${msg.providerID}</span></div>` : ""}
          ${msg.modelId ? `<div class="message-info-item"><span class="info-label">Model:</span><span class="info-value">${msg.modelId}</span></div>` : ""}
          <div class="message-info-item"><span class="info-label">Tokens:</span><span class="info-value">${formatNumber(msg.tokens || 0)}</span></div>
          ${msg.cost !== undefined && msg.cost !== null ? `<div class="message-info-item"><span class="info-label">Cost:</span><span class="info-value">$${msg.cost.toFixed(2)}</span></div>` : ""}
        </div>

        <div class="prt-files-section" id="prt-section-${msg.id}">
          <div class="prt-files-header">
            <span class="prt-files-title">PRT Files</span>
            <span class="prt-files-count" id="prt-count-${msg.id}">Loading...</span>
          </div>
          <div class="prt-files-content" id="prt-content-${msg.id}">
            <div class="loading"><div class="spinner"></div><p>Loading...</p></div>
          </div>
        </div>

        ${msg.title ? `
          <div class="message-content">
            <div class="message-title">${escapeHtml(msg.title)}</div>
            ${msg.fileCount ? `<div class="message-files">${msg.fileCount} file(s) modified</div>` : ""}
            ${msg.diffCount ? `<div class="message-diffs">${formatNumber(msg.diffCount)} line changes</div>` : ""}
          </div>
        ` : ""}
      </div>
    `).join("");
  }

  updatePRTFilesDisplay(messageData) {
    const messageId = messageData.id;
    const countSpan = document.getElementById(`prt-count-${messageId}`);
    const contentDiv = document.getElementById(`prt-content-${messageId}`);

    if (countSpan) {
      if (messageData.prtFiles && messageData.prtFiles.length > 0) {
        countSpan.textContent = `${messageData.prtFiles.length} file${messageData.prtFiles.length > 1 ? "s" : ""}`;
      } else {
        countSpan.textContent = "0 files";
      }
    }

    if (contentDiv) {
      if (messageData.prtFiles && messageData.prtFiles.length > 0) {
        contentDiv.innerHTML = messageData.prtFiles.map(prt => {
          let typeStr = "unknown";

          if (prt.type !== null && prt.type !== undefined) {
            if (typeof prt.type === "string") {
              typeStr = prt.type.length > config.display.maxTypeLength
                ? prt.type.substring(0, config.display.maxTypeLength) + "..."
                : prt.type;
            } else if (typeof prt.type === "object") {
              typeStr = JSON.stringify(prt.type);
            } else {
              typeStr = String(prt.type);
            }
          }

          return `
            <div class="prt-file-item" data-prt-id="${prt.id}">
               <span class="prt-file-type" title="${escapeHtml(String(prt.type))}">${escapeHtml(typeStr)}</span>
               <span class="prt-file-id">${prt.id}</span>
             </div>
           `;
        }).join("");
      } else {
        contentDiv.innerHTML = '<div class="prt-empty">No PRT files</div>';
      }
    }
  }

  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>No Sessions</h3>
        <p>Please verify your OpenCode storage path is correct</p>
      </div>
    `;
  }
}
