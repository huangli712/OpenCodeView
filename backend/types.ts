/**
 * Type definitions for OpenCodeView
 */

export interface TokenUsage {
  input: number;
  output: number;
  cache_write: number;
  cache_read: number;
}

export interface TimeData {
  created?: number;
  completed?: number;
}

export interface InteractionFile {
  filePath: string;
  sessionId: string;
  modelId: string;
  tokens: TokenUsage;
  timeData?: TimeData;
  projectPath?: string;
  rawData?: any;
}

export interface SessionData {
  sessionId: string;
  sessionPath: string;
  files: InteractionFile[];
  sessionTitle?: string;
  totalTokens?: number;
  totalCost?: number;
}

export interface PricingData {
  [modelId: string]: {
    input: number;
    output: number;
    cacheWrite?: number;
    cacheRead?: number;
  };
}

export interface DailyBreakdown {
  date: string;
  sessions: number;
  interactions: number;
  tokens: number;
  cost: number;
}

export interface WeeklyBreakdown {
  week: string;
  days: string[];
  sessions: number;
  interactions: number;
  tokens: number;
  cost: number;
}

export interface MonthlyBreakdown {
  month: string;
  sessions: number;
  interactions: number;
  tokens: number;
  cost: number;
}

export interface ModelBreakdown {
  modelId: string;
  sessions: number;
  interactions: number;
  tokens: number;
  cost: number;
}

export interface ProjectBreakdown {
  projectName: string;
  sessions: number;
  interactions: number;
  tokens: number;
  cost: number;
  modelsUsed: string[];
}

export interface SessionSummary {
  totalSessions: number;
  totalInteractions: number;
  totalTokens: {
    input: number;
    output: number;
    cache_write: number;
    cache_read: number;
    total: number;
  };
  totalCost: number;
  modelsUsed: string[];
  dateRange: string;
}

export interface LiveSessionStatus {
  sessionId: string;
  displayTitle: string;
  projectName: string;
  interactionCount: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  durationHours: number;
  burnRate: number;
  activityStatus: "active" | "recent" | "idle" | "inactive";
}
