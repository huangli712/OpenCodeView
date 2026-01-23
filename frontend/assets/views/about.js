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
        ${this.renderConfigSection(data.config)}
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
    return `
      <div class="about-grid">
        ${this.renderPathItem("Path", mcp.path)}
        ${this.renderCountItem("Count", mcp.serverCount)}
      </div>
    `;
  }

  renderConfigSection(config) {
    const filteredFiles = config.jsonFiles.filter(f => f !== "package.json");
    return `
      <div class="about-grid">
        <div class="about-item">
          <label>Path</label>
          <span class="exists">${config.path}</span>
        </div>
        <div class="about-item">
          <label>Count</label>
          <span class="exists">${filteredFiles.length}</span>
        </div>
      </div>
    `;
  }
}
