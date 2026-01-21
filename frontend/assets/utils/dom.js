export function showLoading(containerId = "app") {
  const app = document.getElementById(containerId);
  if (app) {
    app.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }
}

export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
