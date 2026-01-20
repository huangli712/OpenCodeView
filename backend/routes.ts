import type { SessionData, SessionSummary, MessageInfo } from "./types";
import { FileManager } from "./fileutil";
import { Sessions } from "./sessions";
import path from "node:path";
import { existsSync, readdirSync } from "node:fs";

const fileManager = new FileManager();
const analyzer = new Sessions();

export async function handleGetSessions(req: Request, url: URL): Promise<Response> {
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const allSessions = await fileManager.loadAllSessions();
  const total = allSessions.length;

  const paginatedSessions = await fileManager.loadAllSessions(limit + offset);
  const paginated = paginatedSessions.slice(offset, offset + limit);

  const summary = await analyzer.generateSessionsSummary(paginatedSessions);

  const sessionsWithComputedData = await Promise.all(
    paginated.map(async (session) => {
      const startTime = analyzer.getStartTime(session);
      const durationHours = analyzer.getDurationHours(session);
      const totalCost = await analyzer.costCalculator.calculateSessionCost(session);

      return {
        ...session,
        projectName: analyzer.getProjectName(session),
        startTime: startTime ? startTime.getTime() : null,
        durationHours,
        totalCost
      };
    })
  );

  return Response.json({
    success: true,
    data: sessionsWithComputedData,
    summary,
    pagination: {
      offset,
      limit,
      total,
      hasMore: offset + limit < total
    }
  });
}

export async function handleGetSessionById(req: Request, url: URL): Promise<Response> {
  const sessionId = url.pathname.split("/").pop();
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  if (!sessionId) {
    return Response.json({
      success: false,
      error: "Session ID is required"
    }, { status: 400 });
  }

  const allSessions = await fileManager.loadAllSessions();
  const session = allSessions.find(s => s.sessionId === sessionId);

  if (!session) {
    return Response.json({
      success: false,
      error: "Session not found"
    }, { status: 404 });
  }

  const cost = await analyzer.costCalculator.calculateSessionCost(session);
  const duration = analyzer.getDurationHours(session);
  const projectName = analyzer.getProjectName(session);

  const allMessages = formatMessages(session);
  const totalMessages = allMessages.length;

  const paginatedMessages = allMessages.slice(offset, offset + limit);
  const hasMore = offset + limit < totalMessages;

  const messagesWithPRT = await Promise.all(
    paginatedMessages.map(async (msg) => {
      const prtFiles = await fileManager.loadPRTFiles(msg.id);
      return {
        ...msg,
        prtFiles
      };
    })
  );

  return Response.json({
    success: true,
    data: {
      ...session,
      totalCost: cost,
      durationHours: duration,
      projectName,
      modelsUsed: analyzer.getModelsUsed(session),
      interactionCount: analyzer.getInteractionCount(session),
      displayTitle: analyzer.getDisplayTitle(session),
      messages: messagesWithPRT
    },
    pagination: {
      offset,
      limit,
      total: totalMessages,
      hasMore
    }
  });
}

export async function handleGetMostRecent(req: Request): Promise<Response> {
  const session = await fileManager.getMostRecentSession();

  if (!session) {
    return Response.json({
      success: false,
      error: "No sessions found"
    }, { status: 404 });
  }

  await analyzer.init();

  const cost = await analyzer.costCalculator.calculateSessionCost(session);
  const duration = analyzer.getDurationHours(session);
  const projectName = analyzer.getProjectName(session);
  const burnRate = analyzer.calculateBurnRate(session);

  const end = analyzer.getEndTime(session);
  const activityStatus = getActivityStatus(end);

  return Response.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      displayTitle: analyzer.getDisplayTitle(session),
      projectName,
      interactionCount: analyzer.getInteractionCount(session),
      totalTokens: analyzer.computeTotalTokens(session),
      totalCost: cost,
      modelsUsed: analyzer.getModelsUsed(session),
      durationHours: duration,
      burnRate,
      activityStatus
    }
  });
}

export async function handleGetAnalytics(req: Request, url: URL): Promise<Response> {
  const type = url.searchParams.get("type") || "daily";
  const weekStart = parseInt(url.searchParams.get("weekStart") || "0");

  await analyzer.init();
  const sessions = await fileManager.loadAllSessions();

  switch (type) {
    case "daily":
      const daily = await analyzer.createDailyBreakdown(sessions);
      return Response.json({
        success: true,
        type: "daily",
        data: Array.from(daily.entries()).map(([date, stats]) => ({ date, ...stats }))
      });

    case "weekly":
      const weekly = await analyzer.createWeeklyBreakdown(sessions, weekStart);
      return Response.json({
        success: true,
        type: "weekly",
        weekStart,
        data: Array.from(weekly.entries()).map(([date, stats]) => ({ date, ...stats }))
      });

    case "monthly":
      const monthly = await analyzer.createMonthlyBreakdown(sessions);
      return Response.json({
        success: true,
        type: "monthly",
        data: Array.from(monthly.entries()).map(([date, stats]) => ({ date, ...stats }))
      });

    case "models":
      const models = await analyzer.createModelBreakdown(sessions);
      return Response.json({
        success: true,
        type: "models",
        data: Array.from(models.entries()).map(([modelId, stats]) => ({ modelId, ...stats }))
      });

    case "projects":
      const projects = await analyzer.createProjectBreakdown(sessions);
      return Response.json({
        success: true,
        type: "projects",
        data: Array.from(projects.entries()).map(([name, stats]) => ({ projectName: name, ...stats }))
      });

    default:
      return Response.json({
        success: false,
        error: `Invalid analytics type: ${type}`
      }, { status: 400 });
  }
}

export async function handleGetSummary(req: Request): Promise<Response> {
  await analyzer.init();
  const sessions = await fileManager.loadAllSessions();
  const summary = await analyzer.generateSessionsSummary(sessions);

  return Response.json({
    success: true,
    data: summary
  });
}

export async function handleValidate(req: Request): Promise<Response> {
  const fileManager = new FileManager();
  const path = fileManager.getOpenCodeStoragePath();
  const isValid = await fileManager.validatePath(path);

  const sessionDirs = await fileManager.findSessions(1);
  const hasSessions = sessionDirs.length > 0;

  let warnings: string[] = [];
  if (!hasSessions) {
    warnings.push("No sessions found in storage directory");
  } else {
    const recent = await fileManager.loadSession(sessionDirs[0]);
    if (!recent || recent.files.length === 0) {
      warnings.push("Most recent session has no valid interaction data");
    }
  }

  return Response.json({
    success: true,
    valid: isValid,
    path,
    hasSessions,
    warnings
  });
}

function formatMessages(session: SessionData): MessageInfo[] {
  return session.files.map((file, index) => {
    const data = file.rawData;
    const totalTokens = file.tokens.input +
                      file.tokens.output +
                      file.tokens.cache_write +
                      file.tokens.cache_read;

    let title: string | undefined;
    let fileCount: number | undefined;
    let diffCount: number | undefined;

    if (data.role === "user" && data.summary) {
      title = data.summary.title;
      if (data.summary.diffs) {
        fileCount = data.summary.diffs.length;
        diffCount = data.summary.diffs.reduce((sum, diff) => sum + (diff.additions || 0) + (diff.deletions || 0), 0);
      }
    }

    return {
      id: data.id || `msg_${index}`,
      role: data.role || "unknown",
      modelId: data.modelID || data.model?.modelID,
      providerID: data.providerID,
      mode: data.mode,
      agent: data.agent,
      timestamp: data.time?.created || file.timeData?.created,
      tokens: totalTokens,
      cost: data.cost,
      title,
      fileCount,
      diffCount
    };
  });
}

function getActivityStatus(end: Date | null): "active" | "recent" | "idle" | "inactive" {
  if (!end) return "unknown";

  const now = new Date();
  const secondsAgo = (now.getTime() - end.getTime()) / 1000;

  if (secondsAgo < 60) return "active";
  if (secondsAgo < 300) return "recent";
  if (secondsAgo < 1800) return "idle";
  return "inactive";
}

export async function handleGetOpenCodeInfo(req: Request): Promise<Response> {
  const fileManager = new FileManager();
  const info = await fileManager.getOpenCodeInfo();

  const home = info.homePath;
  const mcpPath = path.join(home, ".config", "opencode", "mcp");
  const skillsPath = path.join(home, ".config", "opencode", "skills");
  const pluginsPath = path.join(home, ".config", "opencode", "plugins");

  const mcpExists = existsSync(mcpPath);
  const skillsExists = existsSync(skillsPath);
  const pluginsExists = existsSync(pluginsPath);

  let mcpServers: string[] = [];
  let skillsCount = 0;
  let pluginsCount = 0;

  if (mcpExists) {
    try {
      const entries = readdirSync(mcpPath);
      mcpServers = entries.filter(e => e.endsWith(".json")).map(e => e.replace(".json", ""));
    } catch (e) {}
  }

  if (skillsExists) {
    try {
      skillsCount = readdirSync(skillsPath).length;
    } catch (e) {}
  }

  if (pluginsExists) {
    try {
      pluginsCount = readdirSync(pluginsPath).length;
    } catch (e) {}
  }

  let version = "Unknown";
  try {
    const versionOutput = await Bun.$`opencode --version`.quiet().text();
    if (versionOutput) {
      const versionMatch = versionOutput.match(/(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }
  } catch (e) {
    const versionPaths = [
      path.join(info.configPath, "package.json"),
      path.join(home, ".local", "share", "opencode", "package.json")
    ];

    for (const vPath of versionPaths) {
      if (existsSync(vPath)) {
        try {
          const content = await Bun.file(vPath).text();
          const pkg = JSON.parse(content);
          version = pkg.version || version;
          if (version && version !== "Unknown") break;
        } catch (e) {}
      }
    }
  }

  return Response.json({
    success: true,
    data: {
      storagePath: info.storagePath,
      configPath: info.configPath,
      homePath: info.homePath,
      hasOpenCode: info.hasOpenCode,
      sessionCount: info.sessionCount,
      version,
      mcp: {
        path: mcpPath,
        exists: mcpExists,
        servers: mcpServers,
        serverCount: mcpServers.length
      },
      skills: {
        path: skillsPath,
        exists: skillsExists,
        count: skillsCount
      },
      plugins: {
        path: pluginsPath,
        exists: pluginsExists,
        count: pluginsCount
      }
    }
  });
}
