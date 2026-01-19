import type {
  SessionData,
  SessionSummary,
  DailyBreakdown,
  WeeklyBreakdown,
  MonthlyBreakdown,
  ModelBreakdown,
  ProjectBreakdown
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

  getStartTime(session: SessionData): Date | null {
    const times: Date[] = [];

    for (const file of session.files) {
      if (file.timeData?.created) {
        times.push(new Date(file.timeData.created));
      }
    }

    if (times.length === 0) return null;

    return new Date(Math.min(...times.map(t => t.getTime())));
  }

  getEndTime(session: SessionData): Date | null {
    const times: Date[] = [];

    for (const file of session.files) {
      if (file.timeData?.completed) {
        times.push(new Date(file.timeData.completed));
      }
    }

    if (times.length === 0) return null;

    return new Date(Math.max(...times.map(t => t.getTime())));
  }

  getDurationHours(session: SessionData): number {
    const start = this.getStartTime(session);
    const end = this.getEndTime(session);

    if (!start || !end) return 0;

    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }

  getModelsUsed(session: SessionData): string[] {
    const models = new Set<string>();

    for (const file of session.files) {
      models.add(file.modelId);
    }

    return Array.from(models);
  }

  getInteractionCount(session: SessionData): number {
    return session.files.length;
  }

  getProjectName(session: SessionData): string {
    if (session.files.length === 0) {
      return "Unknown";
    }

    const projectPaths = session.files
      .map(f => f.projectPath)
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

    let totalCost = 0;
    let totalInteractions = 0;
    const modelsUsed = new Set<string>();
    const startTimes: Date[] = [];
    const endTimes: Date[] = [];

    for (const session of sessions) {
      const tokens = this.computeTotalTokens(session);
      totalTokens.input += tokens.input;
      totalTokens.output += tokens.output;
      totalTokens.cache_write += tokens.cache_write;
      totalTokens.cache_read += tokens.cache_read;

      totalCost += await this.costCalculator.calculateSessionCost(session);
      totalInteractions += this.getInteractionCount(session);

      for (const model of this.getModelsUsed(session)) {
        modelsUsed.add(model);
      }

      const start = this.getStartTime(session);
      const end = this.getEndTime(session);
      if (start) startTimes.push(start);
      if (end) endTimes.push(end);
    }

    let dateRange = "Unknown";
    if (startTimes.length > 0 && endTimes.length > 0) {
      const earliest = new Date(Math.min(...startTimes.map(t => t.getTime())));
      const latest = new Date(Math.max(...endTimes.map(t => t.getTime())));

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

  async createDailyBreakdown(sessions: SessionData[]): Promise<Map<string, DailyBreakdown>> {
    const dailyMap = new Map<string, DailyBreakdown>();

    for (const session of sessions) {
      const start = this.getStartTime(session);
      if (!start) continue;

      const dateKey = start.toISOString().split("T")[0];

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
      const sessionsInDay = sessions.filter(s => {
        const start = this.getStartTime(s);
        return start && start.toISOString().split("T")[0] === dateStr;
      });
      day.cost = await this.costCalculator.calculateSessionsCost(sessionsInDay);
    }

    return dailyMap;
  }

  async createWeeklyBreakdown(sessions: SessionData[], weekStartDay: number = 0): Promise<Map<string, WeeklyBreakdown>> {
    const dailyMap = await this.createDailyBreakdown(sessions);
    const weeklyMap = new Map<string, WeeklyBreakdown>();

    for (const [dateStr, day] of dailyMap) {
      const date = new Date(dateStr);
      const dayOfWeek = date.getDay();

      const daysToSubtract = (dayOfWeek - 1 - weekStartDay + 7) % 7;
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - daysToSubtract);

      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          week: `W${this.getWeekNumber(weekStart)}`,
          days: [],
          sessions: 0,
          interactions: 0,
          tokens: 0,
          cost: 0
        });
      }

      const week = weeklyMap.get(weekKey)!;
      week.days.push(dateStr);
      week.sessions += day.sessions;
      week.interactions += day.interactions;
      week.tokens += day.tokens;
    }

    for (const [weekKey, week] of weeklyMap) {
      const sessionsInWeek = sessions.filter(s => {
        const start = this.getStartTime(s);
        return start && week.days.includes(start.toISOString().split("T")[0]);
      });
      week.cost = await this.costCalculator.calculateSessionsCost(sessionsInWeek);
    }

    return weeklyMap;
  }

  async createMonthlyBreakdown(sessions: SessionData[]): Promise<Map<string, MonthlyBreakdown>> {
    const dailyMap = await this.createDailyBreakdown(sessions);
    const monthlyMap = new Map<string, MonthlyBreakdown>();

    for (const [dateStr, day] of dailyMap) {
      const monthKey = dateStr.slice(0, 7);

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
      month.sessions += day.sessions;
      month.interactions += day.interactions;
      month.tokens += day.tokens;
    }

    for (const [monthKey, month] of monthlyMap) {
      const sessionsInMonth = sessions.filter(s => {
        const start = this.getStartTime(s);
        return start && start.toISOString().slice(0, 7) === monthKey;
      });
      month.cost = await this.costCalculator.calculateSessionsCost(sessionsInMonth);
    }

    return monthlyMap;
  }

  async createModelBreakdown(sessions: SessionData[]): Promise<Map<string, ModelBreakdown>> {
    const modelMap = new Map<string, ModelBreakdown>();

    for (const session of sessions) {
      const models = this.getModelsUsed(session);

      for (const modelId of models) {
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

        const modelFiles = session.files.filter(f => f.modelId === modelId);
        model.interactions += modelFiles.length;

        for (const file of modelFiles) {
          model.tokens += file.tokens.input + file.tokens.output;
        }
      }
    }

    for (const [modelId, model] of modelMap) {
      const sessionsWithModel = sessions.filter(s => {
        const models = this.getModelsUsed(s);
        return models.includes(modelId);
      });
      model.cost = await this.costCalculator.calculateSessionsCost(sessionsWithModel);
    }

    return modelMap;
  }

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

      for (const model of this.getModelsUsed(session)) {
        if (!project.modelsUsed.includes(model)) {
          project.modelsUsed.push(model);
        }
      }
    }

    for (const [projectName, project] of projectMap) {
      const sessionsInProject = sessions.filter(s => {
        return this.getProjectName(s) === projectName;
      });
      project.cost = await this.costCalculator.calculateSessionsCost(sessionsInProject);
    }

    return projectMap;
  }

  calculateBurnRate(session: SessionData): number {
    const total = this.computeTotalTokens(session);
    const tokenCount = total.input + total.output + total.cache_write + total.cache_read;

    if (tokenCount === 0) return 0;

    const start = this.getStartTime(session);
    if (!start) return 0;

    const now = new Date();
    const durationSeconds = (now.getTime() - start.getTime()) / 1000;

    if (durationSeconds <= 0) return 0;

    return tokenCount / (durationSeconds / 60);
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);

    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7));
    return weekNo;
  }
}
