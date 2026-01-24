// Type definitions for OpenCodeView

// Token usage statistics for a single interaction
export interface TokenUsage {
    input: number;
    output: number;
    cache_write: number;
    cache_read: number;
}

// Time data with creation and completion timestamps
export interface TimeData {
    created?: number;
    completed?: number;
}

// Model identifier information
export interface ModelData {
    modelID?: string;
}

// Token usage data with cache information
export interface TokensData {
    input?: number;
    output?: number;
    cache?: {
        write?: number;
        read?: number;
    };
}

// Summary data including title and diff statistics
export interface SummaryData {
    title?: string;
    diffs?: Array<{
        additions?: number;
        deletions?: number;
    }>;
}

// Path information including working directory and root
export interface PathData {
    cwd?: string;
    root?: string;
}

// Time field data with timestamps
export interface TimeFieldData {
    created?: number;
    completed?: number;
}

// Raw interaction data from OpenCode session
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

// Interaction file data with file path and session metadata
export interface InteractionFile {
    filePath: string;
    sessionId: string;
    modelId: string;
    tokens: TokenUsage;
    timeData?: TimeData;
    projectPath?: string;
    rawData?: RawInteractionData;
}

// Complete session data with all interactions and metadata
export interface SessionData {
    sessionId: string;
    sessionPath: string;
    files: InteractionFile[];
    sessionTitle?: string;
    totalTokens?: number;
    totalCost?: number;
}

// Pricing data by model for cost calculation
export interface PricingData {
    [modelId: string]: {
        input: number;
        output: number;
        cacheWrite?: number;
        cacheRead?: number;
    };
}

// Daily statistics breakdown
export interface DailyBreakdown {
    date: string;
    sessions: number;
    interactions: number;
    tokens: number;
    cost: number;
}

// Weekly statistics breakdown
export interface WeeklyBreakdown {
    week: string;
    days: string[];
    sessions: number;
    interactions: number;
    tokens: number;
    cost: number;
}

// Monthly statistics breakdown
export interface MonthlyBreakdown {
    month: string;
    sessions: number;
    interactions: number;
    tokens: number;
    cost: number;
}

// Statistics breakdown by model
export interface ModelBreakdown {
    modelId: string;
    sessions: number;
    interactions: number;
    tokens: number;
    cost: number;
}

// Statistics breakdown by project
export interface ProjectBreakdown {
    projectName: string;
    sessions: number;
    interactions: number;
    tokens: number;
    cost: number;
    modelsUsed: string[];
}

// Summary statistics across all sessions
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

// PRT (Prompt/Response/Tool) data
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

// PRT file information with raw data reference
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

// Message information including metadata and PRT files
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

// OpenCode installation and configuration information
export interface OpenCodeInfo {
    storagePath: string;
    configPath: string;
    homePath: string;
    hasOpenCode: boolean;
    sessionCount: number;
}
