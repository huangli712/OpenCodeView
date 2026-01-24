import type {
    SessionData,
    SessionSummary,
    DailyBreakdown,
    WeeklyBreakdown,
    MonthlyBreakdown,
    ModelBreakdown,
    ProjectBreakdown,
    TokenUsage
} from "./types";
import { CostCalculator } from "./cost";

export class Sessions {
    private costCalculator: CostCalculator;

    constructor() {
        this.costCalculator = new CostCalculator();
    }

    async init(): Promise<void> {
        await this.costCalculator.init();
    }

    // Sum all tokens in a session
    computeTotalTokens(session: SessionData): TokenUsage {
        const total: TokenUsage = {
            input: 0,
            output: 0,
            cache_write: 0,
            cache_read: 0
        };

        for (const file of session.files) {
            total.input += file.tokens.input;
            total.output += file.tokens.output;
            total.cache_write += file.tokens.cache_write;
            total.cache_read += file.tokens.cache_read;
        }

        return total;
    }

    // Get session start time (earliest created timestamp)
    getStartTime(session: SessionData): Date | null {
        const times: Date[] = [];

        for (const file of session.files) {
            if (file.timeData?.created) {
                times.push(new Date(file.timeData.created));
            }
        }

        if (times.length === 0) {
            return null;
        }

        return new Date(Math.min(...times.map((t) => t.getTime())));
    }

    // Get session end time (latest completed timestamp)
    getEndTime(session: SessionData): Date | null {
        const times: Date[] = [];

        for (const file of session.files) {
            if (file.timeData?.completed) {
                times.push(new Date(file.timeData.completed));
            }
        }

        if (times.length === 0) {
            return null;
        }

        return new Date(Math.max(...times.map((t) => t.getTime())));
    }

    // Calculate session duration in hours
    getDurationHours(session: SessionData): number {
        const start = this.getStartTime(session);
        const end = this.getEndTime(session);

        if (!start || !end) {
            return 0;
        }

        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }

    // Get unique models used in session
    getModelsUsed(session: SessionData): string[] {
        const models = new Set<string>();
        const invalidModels = ["", "unknown", "undefined"];

        for (const file of session.files) {
            if (file.modelId && !invalidModels.includes(file.modelId)) {
                models.add(file.modelId);
            }
        }

        return Array.from(models);
    }

    // Get number of interactions in session
    getInteractionCount(session: SessionData): number {
        return session.files.length;
    }

    // Extract most common project name from session paths
    getProjectName(session: SessionData): string {
        if (session.files.length === 0) {
            return "Unknown";
        }

        const projectPaths = session.files
            .map((f) => f.projectPath)
            .filter((p): p is string => !!p);

        if (projectPaths.length === 0) {
            return "Unknown";
        }

        const pathCounts = new Map<string, number>();
        for (const path of projectPaths) {
            const count = pathCounts.get(path) || 0;
            pathCounts.set(path, count + 1);
        }

        const mostCommon = Array.from(pathCounts.entries())
            .sort((a, b) => b[1] - a[1])[0][0];

        return mostCommon.split("/").pop() || "Unknown";
    }

    getDisplayTitle(session: SessionData): string {
        if (session.sessionTitle) {
            const title = session.sessionTitle;
            return title.length > 50 ? title.slice(0, 47) + "..." : title;
        }
        return session.sessionId;
    }

    // Calculate cost per hour for session
    async calculateBurnRate(session: SessionData): Promise<number> {
        const durationHours = this.getDurationHours(session);

        if (durationHours === 0) {
            return 0;
        }

        const cost = await this.costCalculator.calculateSessionCost(session);
        return cost / durationHours;
    }

    // Accumulate session statistics into summary aggregates
    accumulateSessionStats(session: SessionData, totalTokens: TokenUsage, totalInteractionsRef: { value: number }, modelsUsed: Set<string>, startTimes: Date[], endTimes: Date[]): void {
        const tokens = this.computeTotalTokens(session);
        totalTokens.input += tokens.input;
        totalTokens.output += tokens.output;
        totalTokens.cache_write += tokens.cache_write;
        totalTokens.cache_read += tokens.cache_read;

        totalInteractionsRef.value += this.getInteractionCount(session);

        for (const model of this.getModelsUsed(session)) {
            if (model) {
                modelsUsed.add(model);
            }
        }

        const start = this.getStartTime(session);
        const end = this.getEndTime(session);
        if (start) {
            startTimes.push(start);
        }
        if (end) {
            endTimes.push(end);
        }
    }

    // Generate summary statistics from all sessions
    async generateSessionsSummary(sessions: SessionData[]): Promise<SessionSummary> {
        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                totalInteractions: 0,
                totalTokens: {
                    input: 0,
                    output: 0,
                    cache_write: 0,
                    cache_read: 0,
                    total: 0
                },
                totalCost: 0,
                modelsUsed: [],
                dateRange: "No sessions"
            };
        }

        const totalTokens = {
            input: 0,
            output: 0,
            cache_write: 0,
            cache_read: 0,
            total: 0
        };
        const totalInteractionsRef = { value: 0 };
        const modelsUsed = new Set<string>();
        const startTimes: Date[] = [];
        const endTimes: Date[] = [];

        for (const session of sessions) {
            this.accumulateSessionStats(session, totalTokens, totalInteractionsRef, modelsUsed, startTimes, endTimes);
        }

        const totalInteractions = totalInteractionsRef.value;
        const totalCost = await this.costCalculator.calculateSessionsCost(sessions);

        let dateRange = "Unknown";
        if (startTimes.length > 0 && endTimes.length > 0) {
            const earliest = new Date(Math.min(...startTimes.map((t) => t.getTime())));
            const latest = new Date(Math.max(...endTimes.map((t) => t.getTime())));

            const earliestDate = earliest.toISOString().split("T")[0];
            const latestDate = latest.toISOString().split("T")[0];

            dateRange = earliestDate === latestDate
                ? earliestDate
                : `${earliestDate} to ${latestDate}`;
        }

        return {
            totalSessions: sessions.length,
            totalInteractions,
            totalTokens: {
                ...totalTokens,
                total: totalTokens.input + totalTokens.output + totalTokens.cache_write + totalTokens.cache_read
            },
            totalCost,
            modelsUsed: Array.from(modelsUsed).sort(),
            dateRange
        };
    }

    // Group sessions by date for daily stats
    async createDailyBreakdown(sessions: SessionData[]): Promise<Map<string, DailyBreakdown>> {
        const dailyMap = new Map<string, DailyBreakdown>();

        for (const session of sessions) {
            const start = this.getStartTime(session);
            if (!start) {
                continue;
            }

            const dateKey = start.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

        if (!dailyMap.has(dateKey)) {
                dailyMap.set(dateKey, {
                    date: dateKey,
                    sessions: 0,
                    interactions: 0,
                    tokens: 0,
                    cost: 0
                });
            }

            const day = dailyMap.get(dateKey)!;
            day.sessions++;
            day.interactions += this.getInteractionCount(session);

            const tokens = this.computeTotalTokens(session);
            day.tokens += tokens.input + tokens.output + tokens.cache_write + tokens.cache_read;
        }

        for (const [dateStr, day] of dailyMap) {
            const sessionsInDay = sessions.filter((s) => {
                const start = this.getStartTime(s);
                return start && start.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }) === dateStr;
            });
            day.cost = await this.costCalculator.calculateSessionsCost(sessionsInDay);
        }

        return dailyMap;
    }

    // Group sessions by week for weekly stats
    async createWeeklyBreakdown(sessions: SessionData[], weekStartDay: number): Promise<Map<string, WeeklyBreakdown>> {
        const weeklyMap = new Map<string, WeeklyBreakdown>();

        for (const session of sessions) {
            const start = this.getStartTime(session);
            if (!start) {
                continue;
            }

            const sessionDay = start.getDay();
            const daysFromWeekStart = (sessionDay - weekStartDay + 7) % 7;
            const weekStartDate = new Date(start);
            weekStartDate.setDate(start.getDate() - daysFromWeekStart);

            const weekKey = weekStartDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

            if (!weeklyMap.has(weekKey)) {
                // Calculate all days in this week
                const days: string[] = [];
                for (let i = 0; i < 7; i++) {
                    const dayDate = new Date(weekStartDate);
                    dayDate.setDate(weekStartDate.getDate() + i);
                    days.push(dayDate.toISOString().split("T")[0]);
                }

                weeklyMap.set(weekKey, {
                    week: weekKey,
                    days,
                    sessions: 0,
                    interactions: 0,
                    tokens: 0,
                    cost: 0
                });
            }

            const week = weeklyMap.get(weekKey)!;
            week.sessions++;
            week.interactions += this.getInteractionCount(session);

            const tokens = this.computeTotalTokens(session);
            week.tokens += tokens.input + tokens.output + tokens.cache_write + tokens.cache_read;
        }

        // Calculate costs for each week
        for (const [weekKey, week] of weeklyMap) {
            const sessionsInWeek = sessions.filter((s) => {
                const start = this.getStartTime(s);
                if (!start) {
                    return false;
                }

                const sessionDay = start.getDay();
                const daysFromWeekStart = (sessionDay - weekStartDay + 7) % 7;
                const weekStartDate = new Date(start);
                weekStartDate.setDate(start.getDate() - daysFromWeekStart);
                const sessionWeekKey = weekStartDate.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });

                return sessionWeekKey === weekKey;
            });
            week.cost = await this.costCalculator.calculateSessionsCost(sessionsInWeek);
        }

        return weeklyMap;
    }

    // Group sessions by month for monthly stats
    async createMonthlyBreakdown(sessions: SessionData[]): Promise<Map<string, MonthlyBreakdown>> {
        const monthlyMap = new Map<string, MonthlyBreakdown>();

        for (const session of sessions) {
            const start = this.getStartTime(session);
            if (!start) {
                continue;
            }

            const monthKey = start.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }); // YYYY-MM

            if (!monthlyMap.has(monthKey)) {
                monthlyMap.set(monthKey, {
                    month: monthKey,
                    sessions: 0,
                    interactions: 0,
                    tokens: 0,
                    cost: 0
                });
            }

            const month = monthlyMap.get(monthKey)!;
            month.sessions++;
            month.interactions += this.getInteractionCount(session);

            const tokens = this.computeTotalTokens(session);
            month.tokens += tokens.input + tokens.output + tokens.cache_write + tokens.cache_read;
        }

        // Calculate costs for each month
        for (const [monthKey, month] of monthlyMap) {
            const sessionsInMonth = sessions.filter((s) => {
                const start = this.getStartTime(s);
                return start && start.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }) === monthKey;
            });
            month.cost = await this.costCalculator.calculateSessionsCost(sessionsInMonth);
        }

        return monthlyMap;
    }

    // Group sessions by model for stats
    async createModelBreakdown(sessions: SessionData[]): Promise<Map<string, ModelBreakdown>> {
        const modelMap = new Map<string, ModelBreakdown>();

        for (const session of sessions) {
            const modelsUsed = this.getModelsUsed(session);

            for (const modelId of modelsUsed) {
                if (!modelMap.has(modelId)) {
                    modelMap.set(modelId, {
                        modelId,
                        sessions: 0,
                        interactions: 0,
                        tokens: 0,
                        cost: 0
                    });
                }

                const model = modelMap.get(modelId)!;
                model.sessions++;
                model.interactions += this.getInteractionCount(session);

                const tokens = this.computeTotalTokens(session);
                // Distribute tokens evenly across models used in this session
                model.tokens += tokens.input + tokens.output + tokens.cache_write + tokens.cache_read;
            }
        }

        // Calculate costs for each model
        for (const [modelId, model] of modelMap) {
            const sessionsForModel = sessions.filter((s) => {
                return this.getModelsUsed(s).includes(modelId);
            });
            // Calculate cost proportionally
            const totalCost = await this.costCalculator.calculateSessionsCost(sessionsForModel);
            model.cost = totalCost;
        }

        return modelMap;
    }

    // Group sessions by project for stats
    async createProjectBreakdown(sessions: SessionData[]): Promise<Map<string, ProjectBreakdown>> {
        const projectMap = new Map<string, ProjectBreakdown>();

        for (const session of sessions) {
            const projectName = this.getProjectName(session);

            if (!projectMap.has(projectName)) {
                projectMap.set(projectName, {
                    projectName,
                    sessions: 0,
                    interactions: 0,
                    tokens: 0,
                    cost: 0,
                    modelsUsed: []
                });
            }

            const project = projectMap.get(projectName)!;
            project.sessions++;
            project.interactions += this.getInteractionCount(session);

            const tokens = this.computeTotalTokens(session);
            project.tokens += tokens.input + tokens.output + tokens.cache_write + tokens.cache_read;

            // Collect models used in this project
            const modelsUsed = this.getModelsUsed(session);
            for (const model of modelsUsed) {
                if (!project.modelsUsed.includes(model)) {
                    project.modelsUsed.push(model);
                }
            }
        }

        // Calculate costs for each project
        for (const [projectName, project] of projectMap) {
            const sessionsInProject = sessions.filter((s) => {
                return this.getProjectName(s) === projectName;
            });
            project.cost = await this.costCalculator.calculateSessionsCost(sessionsInProject);
        }

        return projectMap;
    }
}