import type { SessionData, SessionSummary, MessageInfo } from "./types";
import { FileManager } from "./fileutil";
import { Sessions } from "./sessions";
import { joinPath } from "./utils/path.js";
import { promises as fsPromises } from "node:fs";

// Utility function for safe integer parsing
function parseSafeInt(value: string | null, defaultValue: number): number {
  const parsed = parseInt(value || `${defaultValue}`, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Helper function to enrich session data with computed fields
async function enrichSession(session: SessionData, analyzer: Sessions) {
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
}

const fileManager = new FileManager();
const analyzer = new Sessions();

analyzer.init().catch((error) => {
  console.error("Failed to initialize analyzer:", error);
  console.warn("Cost calculations will return 0. Please ensure config/models.json exists and is valid.");
});

/**
 * GET /api/sessions - List all sessions with pagination
 * @param req - HTTP request
 * @param url - Request URL with query params (limit, offset)
 * @returns JSON response with sessions data, summary, and pagination info
 */
export async function handleGetSessions(req: Request, url: URL): Promise<Response> {

analyzer.init().catch((error) => {
  console.error("Failed to initialize analyzer:", error);
  console.warn("Cost calculations will return 0. Please ensure config/models.json exists and is valid.");
});

export async function handleGetSessions(req: Request, url: URL): Promise<Response> {
  const limit = Math.min(Math.max(parseSafeInt(url.searchParams.get("limit"), 50), 1), 1000);
  const offset = Math.max(parseSafeInt(url.searchParams.get("offset"), 0), 0);

  const sessions = await fileManager.loadAllSessions(limit + offset);
  const total = await fileManager.findSessions().length;

  const paginated = sessions.slice(offset, offset + limit);
  const summary = await analyzer.generateSessionsSummary(paginated);

  const sessionsWithComputedData = await Promise.all(
    paginated.map((session) => enrichSession(session, analyzer))
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

/**
 * GET /api/sessions/:id - Get session details by ID
 * @param req - HTTP request
 * @param url - Request URL with session ID in path
 * @returns JSON response with session data and messages (paginated)
 */
export async function handleGetSessionById(req: Request, url: URL): Promise<Response> {
  const pathParts = url.pathname.split("/");
  const sessionId = pathParts[pathParts.length - 1];
  const limit = Math.min(Math.max(parseSafeInt(url.searchParams.get("limit"), 50), 1), 1000);
  const offset = Math.max(parseSafeInt(url.searchParams.get("offset"), 0), 0);

  if (!sessionId) {
    return Response.json({
      success: false,
      error: "Session ID is required"
    }, { status: 400 });
  }

  const allSessions = await fileManager.loadAllSessions();
  const session = allSessions.find((s) => s.sessionId === sessionId);

  if (!session) {
    return Response.json({
      success: false,
      error: "Session not found"
    }, { status: 404 });
  }

  const enrichedSession = await enrichSession(session, analyzer);

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
      ...enrichedSession,
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

/**
 * GET /api/sessions/recent - Get most recent session
 * @param req - HTTP request
 * @returns JSON response with recent session data
 */
export async function handleGetMostRecent(req: Request): Promise<Response> {
  const session = await fileManager.getMostRecentSession();

  if (!session) {
    return Response.json({
      success: false,
      error: "No sessions found"
    }, { status: 404 });
  }

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

/**
 * GET /api/analytics - Get analytics data (daily/weekly/monthly/models/projects)
 * @param req - HTTP request
 * @param url - Request URL with query params (type, weekStart)
 * @returns JSON response with analytics data by type
 */
export async function handleGetAnalytics(req: Request, url: URL): Promise<Response> {
  const type = url.searchParams.get("type") || "daily";
  const validTypes = ["daily", "weekly", "monthly", "models", "projects"];

  if (!validTypes.includes(type)) {
    return Response.json({
      success: false,
      error: `Invalid analytics type: ${type}. Valid types are: ${validTypes.join(", ")}`
    }, { status: 400 });
  }

  const weekStart = Math.min(Math.max(parseSafeInt(url.searchParams.get("weekStart"), 0), 0), 6);

  const sessions = await fileManager.loadAllSessions();

  switch (type) {
    case "daily": {
      const daily = await analyzer.createDailyBreakdown(sessions);
      return Response.json({
        success: true,
        type: "daily",
        data: Array.from(daily.entries()).map(([date, stats]) => ({ date, ...stats }))
      });
    }

    case "weekly": {
      const weekly = await analyzer.createWeeklyBreakdown(sessions, weekStart);
      return Response.json({
        success: true,
        type: "weekly",
        weekStart,
        data: Array.from(weekly.entries()).map(([date, stats]) => ({ date, ...stats }))
      });
    }

    case "monthly": {
      const monthly = await analyzer.createMonthlyBreakdown(sessions);
      return Response.json({
        success: true,
        type: "monthly",
        data: Array.from(monthly.entries()).map(([date, stats]) => ({ date, ...stats }))
      });
    }

    case "models": {
      const models = await analyzer.createModelBreakdown(sessions);
      return Response.json({
        success: true,
        type: "models",
        data: Array.from(models.entries()).map(([modelId, stats]) => ({ modelId, ...stats }))
      });
    }

    case "projects": {
      const projects = await analyzer.createProjectBreakdown(sessions);
      return Response.json({
        success: true,
        type: "projects",
        data: Array.from(projects.entries()).map(([name, stats]) => ({ projectName: name, ...stats }))
      });
    }

    default: {
      return Response.json({
        success: false,
        error: `Invalid analytics type: ${type}`
      }, { status: 400 });
    }
  }
}

/**
 * GET /api/summary - Get overall summary statistics
 * @param req - HTTP request
 * @returns JSON response with total statistics
 */
export async function handleGetSummary(req: Request): Promise<Response> {
  const sessions = await fileManager.loadAllSessions();
  const summary = await analyzer.generateSessionsSummary(sessions);

  return Response.json({
    success: true,
    data: summary
  });
}

/**
 * GET /api/validate - Validate OpenCode installation
 * @param req - HTTP request
 * @returns JSON response with validation status
 */
export async function handleValidate(req: Request): Promise<Response> {
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
  if (!end) {
    return "unknown";
  }

  const now = new Date();
  const secondsAgo = (now.getTime() - end.getTime()) / 1000;

  if (secondsAgo < 60) {
    return "active";
  }
  if (secondsAgo < 300) {
    return "recent";
  }
  if (secondsAgo < 1800) {
    return "idle";
  }
  return "inactive";
}

/**
 * GET /api/opencode - Get OpenCode installation information
 * @param req - HTTP request
 * @returns JSON response with OpenCode info, MCP servers, skills, plugins, version
 */
export async function handleGetOpenCodeInfo(req: Request): Promise<Response> {
  const info = await fileManager.getOpenCodeInfo();

  const home = info.homePath;
  const mcpPath = joinPath(home, ".config", "opencode", "mcp");
  const skillsPath = joinPath(home, ".config", "opencode", "skills");
  const pluginsPath = joinPath(home, ".config", "opencode", "plugins");

  let mcpExists = false;
  let skillsExists = false;
  let pluginsExists = false;

  try {
    await fsPromises.access(mcpPath);
    mcpExists = true;
  } catch {}

  try {
    await fsPromises.access(skillsPath);
    skillsExists = true;
  } catch {}

  try {
    await fsPromises.access(pluginsPath);
    pluginsExists = true;
  } catch {}

  let mcpServers: string[] = [];
  let skillsCount = 0;
  let pluginsCount = 0;

  if (mcpExists) {
    try {
      const entries = await fsPromises.readdir(mcpPath);
      mcpServers = entries.filter((e) => e.endsWith(".json")).map((e) => e.replace(".json", ""));
    } catch (e) {
      console.error("Error reading MCP directory:", e);
    }
  }

  if (skillsExists) {
    try {
      const entries = await fsPromises.readdir(skillsPath);
      skillsCount = entries.length;
    } catch (e) {
      console.error("Error reading skills directory:", e);
    }
  }

  if (pluginsExists) {
    try {
      const entries = await fsPromises.readdir(pluginsPath);
      pluginsCount = entries.length;
    } catch (e) {
      console.error("Error reading plugins directory:", e);
    }
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
    console.error("Error getting OpenCode version from command:", e);
    const versionPaths = [
      joinPath(info.configPath, "package.json"),
      joinPath(home, ".local", "share", "opencode", "package.json")
    ];

    for (const vPath of versionPaths) {
      try {
        await fsPromises.access(vPath);
      } catch {
        continue;
      }

      try {
        const content = await Bun.file(vPath).text();
        const pkg = JSON.parse(content);
        version = pkg.version || version;
        if (version && version !== "Unknown") {
          break;
        }
      } catch (e) {
        console.error("Error reading version from package.json:", e);
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
