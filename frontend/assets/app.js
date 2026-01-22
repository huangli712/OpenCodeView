import { API } from "./api.js";
import { AppState } from "./state.js";
import { DashboardView } from "./views/dashboard.js";
import { SessionsView } from "./views/sessions.js";
import { AnalyticsView } from "./views/analytics.js";
import { AboutView } from "./views/about.js";
import { ToastComponent } from "./components/toasts.js";
import { showLoading } from "./utils/dom.js";
import { config } from "./config.js";

class OpenCodeView {
  constructor() {
    this.api = new API();
    this.state = new AppState();
    this.toasts = new ToastComponent();

    this.sessionClickHandler = null;
    this.paginationClickHandler = null;
    this.beforeUnloadHandler = null;
    this.hashChangeHandler = null;
    this.modalEscapeHandlers = new Map();
    this.modalClickHandlers = new Map();
    this.prtClickHandlers = [];
    this.backToListHandler = null;

    this.views = {
      dashboard: new DashboardView(this.api),
      sessions: new SessionsView(this.api),
      daily: new AnalyticsView(this.api),
      weekly: new AnalyticsView(this.api),
      monthly: new AnalyticsView(this.api),
      models: new AnalyticsView(this.api),
      projects: new AnalyticsView(this.api)
    };

    this.setupEventListeners();
  }

  async init() {
    await this.loadDashboard();
    this.updateFooterTime();
    setInterval(() => this.updateFooterTime(), config.ui.updateInterval);
    this.setupAboutModal();
    this.setupPRTModal();
  }

  updateFooterTime() {
    const footerTime = document.querySelector(".footer-time");
    if (footerTime) {
      footerTime.textContent = new Date().toLocaleString(config.display.defaultLocale);
    }
  }

  setupEventListeners() {
    document.addEventListener("DOMContentLoaded", () => {
      this.init();
    });

    document.querySelectorAll("[data-tab]").forEach(tab => {
      tab.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchTab(tab.dataset.tab || "dashboard");
      });
    });

    this.hashChangeHandler = () => {
      const hash = window.location.hash.slice(1) || "dashboard";
      this.switchTab(hash);
    };
    window.addEventListener("hashchange", this.hashChangeHandler);

    this.beforeUnloadHandler = () => {
      this.cleanup();
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  async switchTab(tab) {
    if (this.state.getCurrentTab() === tab) return;

    this.state.setTab(tab);
    this.updateNavLinks(tab);

    try {
      await this.loadTabContent(tab);
    } catch (error) {
      this.toasts.error("Loading Failed", error.message);
    }
  }

  updateNavLinks(activeTab) {
    document.querySelectorAll(".nav-link").forEach(el => {
      el.classList.remove("active");
      if (el.dataset.tab === activeTab) {
        el.classList.add("active");
      }
    });
  }

  async loadTabContent(tab) {
    showLoading();
    const app = document.getElementById("app");

    switch (tab) {
      case "dashboard":
        app.innerHTML = await this.views.dashboard.load();
        break;

      case "sessions": {
        const result = await this.views.sessions.loadList(
          config.pagination.defaultLimit,
          0
        );
        app.innerHTML = result.html;
        this.setupSessionEvents();
        this.setupPaginationEvents();
        break;
      }

      case "daily":
      case "weekly":
      case "monthly":
      case "models":
      case "projects": {
        const view = this.views[tab];
        const result = await view.load(tab);
        app.innerHTML = result.html;
        view.renderCharts(result.data, tab);
        break;
      }
    }
  }

  async loadDashboard() {
    const app = document.getElementById("app");
    app.innerHTML = await this.views.dashboard.load();
  }

  setupSessionEvents() {
    if (this.sessionClickHandler) {
      document.removeEventListener("click", this.sessionClickHandler);
    }

    this.sessionClickHandler = async (e) => {
      const card = e.target.closest(".session-card");
      if (card && card.dataset.sessionId) {
        await this.loadSessionDetails(card.dataset.sessionId);
      }
    };
    document.addEventListener("click", this.sessionClickHandler);
  }

  setupPaginationEvents() {
    if (this.paginationClickHandler) {
      document.removeEventListener("click", this.paginationClickHandler);
    }

    this.paginationClickHandler = async (e) => {
      const target = e.target;

      if (target.classList.contains("btn") && target.dataset.offset) {
        e.preventDefault();
        const offset = parseInt(target.dataset.offset);
        await this.loadSessionsList(config.pagination.defaultLimit, offset);
      }

      if (target.classList.contains("message-page-btn") && target.dataset.messageOffset) {
        e.preventDefault();
        const offset = parseInt(target.dataset.messageOffset);
        const sessionId = this.state.getCurrentSessionId();
        await this.loadMessages(sessionId, config.pagination.defaultLimit, offset);
      }
    };

    document.addEventListener("click", this.paginationClickHandler);
  }

  async loadSessionsList(limit, offset) {
    showLoading();
    const app = document.getElementById("app");
    const result = await this.views.sessions.loadList(limit, offset);
    app.innerHTML = result.html;
    this.setupSessionEvents();
    this.setupPaginationEvents();
  }

  async loadSessionDetails(sessionId) {
    this.state.setCurrentSession(sessionId);
    showLoading();
    const app = document.getElementById("app");

    const result = await this.views.sessions.loadDetails(
      sessionId,
      config.pagination.defaultLimit,
      0
    );
    app.innerHTML = result.html;

    const backBtn = document.getElementById("back-to-list-button");
    if (backBtn) {
      if (this.backToListHandler) {
        backBtn.removeEventListener("click", this.backToListHandler);
      }
      this.backToListHandler = async () => {
        await this.loadSessionsList(
          config.pagination.defaultLimit,
          this.state.getPagination().offset
        );
      };
      backBtn.addEventListener("click", this.backToListHandler);
    }

    this.setupPaginationEvents();
    this.setupMessagePRTEvents(result.messages);
  }

  async loadMessages(sessionId, limit = config.pagination.defaultLimit, offset) {
    showLoading();
    const app = document.getElementById("app");

    const result = await this.views.sessions.loadDetails(sessionId, limit, offset);
    app.innerHTML = result.html;

    const backBtn = document.getElementById("back-to-list-button");
    if (backBtn) {
      if (this.backToListHandler) {
        backBtn.removeEventListener("click", this.backToListHandler);
      }
      this.backToListHandler = async () => {
        await this.loadSessionsList(
          config.pagination.defaultLimit,
          this.state.getPagination().offset
        );
      };
      backBtn.addEventListener("click", this.backToListHandler);
    }

    this.setupPaginationEvents();
    this.setupMessagePRTEvents(result.messages);
  }

  setupMessagePRTEvents(messages) {
    if (!messages) return;

    const messageCards = document.querySelectorAll(".message-card");
    for (const card of messageCards) {
      const messageId = card.querySelector(".message-id")?.textContent.replace("ID: ", "");
      if (messageId) {
        const messageData = messages.find(m => m.id === messageId);
        if (messageData) {
          this.views.sessions.updatePRTFilesDisplay(messageData);
        }
      }
    }

    document.querySelectorAll(".prt-file-type").forEach(typeEl => {
      const handler = (e) => {
        e.stopPropagation();
        const prtId = typeEl.closest(".prt-file-item")?.dataset.prtId;
        if (prtId) {
          const messageData = messages.find(m => m.prtFiles?.some(p => p.id === prtId));
          if (messageData) {
            const prtData = messageData.prtFiles.find(p => p.id === prtId);
            if (prtData) {
              this.showPRTModal(prtData);
            }
          }
        }
      };
      typeEl.addEventListener("click", handler);
      this.prtClickHandlers.push({ el: typeEl, handler });
    });
  }

  setupAboutModal() {
    const aboutBtn = document.getElementById("about-btn");
    const modal = document.getElementById("about-modal");
    const content = document.getElementById("about-content");
    const closeBtn = modal?.querySelector(".modal-close");

    aboutBtn?.addEventListener("click", async () => {
      modal?.classList.add("active");
      const aboutView = new AboutView(this.api);
      content.innerHTML = await aboutView.load();
    });

    closeBtn?.addEventListener("click", () => modal?.classList.remove("active"));
    this.setupModalClose(modal);
  }

  setupPRTModal() {
    const modal = document.getElementById("prt-modal");
    const closeBtn = modal?.querySelector(".modal-close");

    closeBtn?.addEventListener("click", () => modal?.classList.remove("active"));
    this.setupModalClose(modal);
  }

  setupModalClose(modal) {
    if (!modal) return;

    const clickHandler = (e) => {
      if (e.target === modal) {
        modal.classList.remove("active");
      }
    };
    modal.addEventListener("click", clickHandler);
    this.modalClickHandlers.set(modal, clickHandler);

    const closeOnEscape = (e) => {
      if (e.key === "Escape" && modal?.classList.contains("active")) {
        modal.classList.remove("active");
      }
    };

    document.addEventListener("keydown", closeOnEscape, { once: true });
    this.modalEscapeHandlers.set(modal, closeOnEscape);
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

  cleanup() {
    if (this.sessionClickHandler) {
      document.removeEventListener("click", this.sessionClickHandler);
      this.sessionClickHandler = null;
    }

    if (this.paginationClickHandler) {
      document.removeEventListener("click", this.paginationClickHandler);
      this.paginationClickHandler = null;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    if (this.hashChangeHandler) {
      window.removeEventListener("hashchange", this.hashChangeHandler);
      this.hashChangeHandler = null;
    }

    if (this.backToListHandler) {
      const backBtn = document.getElementById("back-to-list-button");
      if (backBtn) {
        backBtn.removeEventListener("click", this.backToListHandler);
      }
      this.backToListHandler = null;
    }

    this.prtClickHandlers.forEach(({ el, handler }) => {
      el.removeEventListener("click", handler);
    });
    this.prtClickHandlers = [];

    this.modalClickHandlers.forEach((handler, modal) => {
      modal.removeEventListener("click", handler);
    });
    this.modalClickHandlers.clear();

    this.modalEscapeHandlers.forEach((handler, modal) => {
      document.removeEventListener("keydown", handler);
    });
    this.modalEscapeHandlers.clear();

    Object.values(this.views).forEach(view => {
      if (view.charts && typeof view.charts.destroyAll === "function") {
        view.charts.destroyAll();
      }
    });
  }
}

const view = new OpenCodeView();
export default view;
