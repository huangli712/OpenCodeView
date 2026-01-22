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

export interface ModelData {
  modelID?: string;
}

export interface TokensData {
  input?: number;
  output?: number;
  cache?: {
    write?: number;
    read?: number;
  };
}

export interface SummaryData {
  title?: string;
  diffs?: Array<{
    additions?: number;
    deletions?: number;
  }>;
}

export interface PathData {
  cwd?: string;
  root?: string;
}

export interface TimeFieldData {
  created?: number;
  completed?: number;
}

export interface RawInteractionData {
  id?: string;
  role?: string;
  modelID?: string;
  model?: ModelData;
  providerID?: string;
  mode?: string;
  agent?: string;
  time?: TimeFieldData;
  tokens?: TokensData;
  cost?: number;
  path?: PathData;
  summary?: SummaryData;
}

export interface InteractionFile {
  filePath: string;
  sessionId: string;
  modelId: string;
  tokens: TokenUsage;
  timeData?: TimeData;
  projectPath?: string;
  rawData?: RawInteractionData;
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

export interface PRTData {
  id: string;
  type: string;
  text?: string;
  time?: {
    start?: number;
    end?: number;
  };
  messageID: string;
  sessionID: string;
}

export interface PRTInfo {
  id: string;
  type: string;
  text?: string;
  time?: {
    start?: number;
    end?: number;
  };
  messageID: string;
  sessionID: string;
  rawData?: PRTData;
}

export interface MessageInfo {
  id: string;
  role: string;
  modelId?: string;
  providerID?: string;
  mode?: string;
  agent?: string;
  timestamp?: number;
  tokens?: number;
  cost?: number;
  title?: string;
  fileCount?: number;
  diffCount?: number;
  prtFiles?: PRTInfo[];
}
