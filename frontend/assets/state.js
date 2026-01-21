import { config } from "./config.js";

export class AppState {
  constructor() {
    this.currentTab = "dashboard";
    this.currentData = null;
    this.pagination = {
      offset: 0,
      limit: config.pagination.defaultLimit,
      hasMore: false
    };
    this.sessionPagination = {
      offset: 0,
      limit: config.pagination.defaultLimit,
      hasMore: false
    };
    this.currentSessionId = null;
  }

  setTab(tab) {
    this.currentTab = tab;
  }

  setPagination(offset, limit, hasMore) {
    this.pagination = { offset, limit, hasMore };
  }

  setSessionPagination(offset, limit, hasMore) {
    this.sessionPagination = { offset, limit, hasMore };
  }

  setCurrentSession(sessionId) {
    this.currentSessionId = sessionId;
    this.sessionPagination = {
      offset: 0,
      limit: config.pagination.defaultLimit,
      hasMore: false
    };
  }

  getPagination() {
    return this.pagination;
  }

  getSessionPagination() {
    return this.sessionPagination;
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }

  getCurrentTab() {
    return this.currentTab;
  }
}
