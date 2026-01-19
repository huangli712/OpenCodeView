import type { SessionData, LiveSessionStatus } from "./types";
import { FileManager } from "./fileutil";
import { Sessions } from "./sessions";
import { lstatSync } from "node:fs";

interface WSMessage {
  type: "subscribe" | "unsubscribe" | "get_status";
  sessionId?: string;
}

interface WSUpdate {
  type: "initial" | "session_update";
  data: LiveSessionStatus;
}

const connectedClients = new Set<WebSocket>();
let intervalId: number | null = null;
let lastModTime = 0;
let currentSession: SessionData | null = null;

export async function handleWSOpen(ws: WebSocket, req: Request) {
  console.log("WebSocket client connected");

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("session");

  connectedClients.add(ws);

  if (sessionId) {
    const fileManager = new FileManager();
    const sessionPaths = await fileManager.findSessions();
    const sessionPath = sessionPaths.find(s => s.includes(sessionId));

    if (sessionPath) {
      const session = await fileManager.loadSession(sessionPath);
      if (session) {
        currentSession = session;
        await sendInitialData(ws, session);
      }
    }
  }

  if (!currentSession) {
    const fileManager = new FileManager();
    const session = await fileManager.getMostRecentSession();
    if (session) {
      currentSession = session;
      await sendInitialData(ws, session);
    }
  }

  startWatching();

  ws.send(JSON.stringify({
    type: "connected",
    message: "WebSocket connected successfully"
  } as WSUpdate));
}

export async function handleWSMessage(ws: WebSocket, message: string | Buffer): Promise<void> {
  try {
    const msg = JSON.parse(message.toString()) as WSMessage;

    switch (msg.type) {
      case "subscribe":
        if (msg.sessionId) {
          await subscribeToSession(ws, msg.sessionId);
        }
        break;

      case "unsubscribe":
        break;

      case "get_status":
        if (currentSession) {
          await sendSessionStatus(ws, currentSession);
        }
        break;
    }
  } catch (error) {
    console.error("Error handling WebSocket message:", error);
  }
}

export function handleWSClose(ws: WebSocket): void {
  console.log("WebSocket client disconnected");
  connectedClients.delete(ws);

  if (connectedClients.size === 0) {
    stopWatching();
  }
}

async function sendInitialData(ws: WebSocket, session: SessionData): Promise<void> {
  const analyzer = new Sessions();
  await analyzer.init();

  const cost = await sessions.costCalculator.calculateSessionCost(session);
  const duration = analyzer.getDurationHours(session);
  const projectName = analyzer.getProjectName(session);
  const burnRate = analyzer.calculateBurnRate(session);
  const end = analyzer.getEndTime(session);
  const activityStatus = getActivityStatus(end);

  const data: LiveSessionStatus = {
    sessionId: session.sessionId,
    displayTitle: analyzer.getDisplayTitle(session),
    projectName,
    interactionCount: analyzer.getInteractionCount(session),
    totalTokens: analyzer.computeTotalTokens(session).input +
                 analyzer.computeTotalTokens(session).output +
                 analyzer.computeTotalTokens(session).cache_write +
                 analyzer.computeTotalTokens(session).cache_read,
    totalCost: cost,
    modelsUsed: analyzer.getModelsUsed(session),
    durationHours: duration,
    burnRate,
    activityStatus
  };

  ws.send(JSON.stringify({
    type: "initial",
    data
  } as WSUpdate));
}

async function sendSessionStatus(ws: WebSocket, session: SessionData): Promise<void> {
  await sendInitialData(ws, session);
}

async function subscribeToSession(ws: WebSocket, sessionId: string): Promise<void> {
  const fileManager = new FileManager();
  const sessionPaths = await fileManager.findSessions();
  const sessionPath = sessionPaths.find(s => s.includes(sessionId));

  if (sessionPath) {
    const session = await fileManager.loadSession(sessionPath);
    if (session) {
      currentSession = session;
      await sendInitialData(ws, session);
    }
  }
}

function startWatching(): void {
  if (intervalId !== null) return;

  intervalId = setInterval(async () => {
    const fileManager = new FileManager();
    const sessionPaths = await fileManager.findSessions();

    if (sessionPaths.length === 0) return;

    const latestPath = sessionPaths[0];
    const currentModTime = lstatSync(latestPath).mtimeMs;

    if (currentModTime > lastModTime) {
      lastModTime = currentModTime;

      const session = await fileManager.loadSession(latestPath);
      if (session) {
        currentSession = session;

        const data = await getSessionStatusData(session);
        broadcastUpdate(data);
      }
    }
  }, 1000);
}

function stopWatching(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

async function getSessionStatusData(session: SessionData): Promise<LiveSessionStatus> {
  const analyzer = new Sessions();
  await analyzer.init();

  const cost = await sessions.costCalculator.calculateSessionCost(session);
  const duration = analyzer.getDurationHours(session);
  const projectName = analyzer.getProjectName(session);
  const burnRate = analyzer.calculateBurnRate(session);
  const end = analyzer.getEndTime(session);
  const activityStatus = getActivityStatus(end);

  return {
    sessionId: session.sessionId,
    displayTitle: analyzer.getDisplayTitle(session),
    projectName,
    interactionCount: analyzer.getInteractionCount(session),
    totalTokens: analyzer.computeTotalTokens(session).input +
                 analyzer.computeTotalTokens(session).output +
                 analyzer.computeTotalTokens(session).cache_write +
                 analyzer.computeTotalTokens(session).cache_read,
    totalCost: cost,
    modelsUsed: analyzer.getModelsUsed(session),
    durationHours: duration,
    burnRate,
    activityStatus
  };
}

function broadcastUpdate(data: LiveSessionStatus): void {
  const update: WSUpdate = {
    type: "session_update",
    data
  };

  for (const client of connectedClients) {
    try {
      client.send(JSON.stringify(update));
    } catch (error) {
      console.error("Error sending update to client:", error);
      connectedClients.delete(client);
    }
  }
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

export function cleanup(): void {
  stopWatching();
  connectedClients.clear();
  currentSession = null;
}
