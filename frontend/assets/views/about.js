export class AboutView {
  constructor(api) {
    this.api = api;
  }

  async load() {
    const result = await this.api.getOpenCodeInfo();
    return this.render(result.data);
  }

  render(data) {
    return `
      <div class="about-section">
        <h3>ℹ️ About OpenCode</h3>
        <div class="about-grid">
          <div class="about-item">
            <label>Version</label>
            <span class="${data.version !== "Unknown" ? "exists" : "not-exists"}">${data.version}</span>
          </div>
        </div>
      </div>

      <div class="about-section">
        <h3>📁 Storage</h3>
        <div class="about-grid">
          ${this.renderPathItem("Path", data.storagePath)}
          ${this.renderCountItem("Count", data.sessionCount)}
        </div>
      </div>

      <div class="about-section">
        <h3>⚙️ Configuration</h3>
        <div class="about-grid">
          ${this.renderPathItem("Path", data.configPath)}
        </div>
      </div>

      <div class="about-section">
        <h3>🔌 MCP Servers</h3>
        ${this.renderMCPSection(data.mcp)}
      </div>

      <div class="about-section">
        <h3>🧠 Skills</h3>
        <div class="about-grid">
          ${this.renderPathItem("Path", data.skills.path)}
          ${this.renderCountItem("Count", data.skills.count)}
        </div>
      </div>

      <div class="about-section">
        <h3>🔌 Plugins</h3>
        <div class="about-grid">
          ${this.renderPathItem("Path", data.plugins.path)}
          ${this.renderCountItem("Count", data.plugins.count)}
        </div>
      </div>
    `;
  }

  renderPathItem(label, value) {
    return `<div class="about-item"><label>${label}</label><span class="exists">${value}</span></div>`;
  }

  renderCountItem(label, value) {
    return `<div class="about-item"><label>${label}</label><span class="exists">${value}</span></div>`;
  }

  renderMCPSection(mcp) {
    if (mcp.exists) {
      return `
        <div class="about-mcp-container">
          <label class="about-mcp-label">MCP Servers</label>
          <div class="about-mcp-list">
            ${mcp.servers.length > 0
              ? mcp.servers.map(s => `<span class="mcp-server-tag">${s}</span>`).join("")
              : '<span class="not-exists">No MCP servers configured</span>'}
          </div>
        </div>
      `;
    } else {
      return `
        <div class="about-grid">
          ${this.renderPathItem("Path", mcp.path)}
        </div>
      `;
    }
  }
}
