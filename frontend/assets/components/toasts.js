import { config } from "../config.js";

export class ToastComponent {
  show(message, detail = "", type = "success") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const messageDiv = document.createElement("div");
    messageDiv.className = "toast-message";

    const messageStrong = document.createElement("strong");
    messageStrong.textContent = message;
    messageDiv.appendChild(messageStrong);

    if (detail) {
      const detailBr = document.createElement("br");
      const detailText = document.createTextNode(detail);
      messageDiv.appendChild(detailBr);
      messageDiv.appendChild(detailText);
    }

    toast.appendChild(messageDiv);

    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => toast.remove());

    toast.appendChild(closeBtn);

    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, config.ui.toastDuration);
  }

  success(message, detail = "") {
    this.show(message, detail, "success");
  }

  error(message, detail = "") {
    this.show(message, detail, "error");
  }
}
