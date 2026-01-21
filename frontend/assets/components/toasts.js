export class ToastComponent {
  show(message, detail = "", type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

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

  success(message, detail = "") {
    this.show(message, detail, "success");
  }

  error(message, detail = "") {
    this.show(message, detail, "error");
  }
}
