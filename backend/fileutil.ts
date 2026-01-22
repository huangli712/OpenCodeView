import { existsSync, readdirSync, lstatSync } from "node:fs";
import { promises as fsPromises } from "node:fs";
import type { TokenUsage, TimeData, InteractionFile, SessionData, PricingData, PRTInfo, TokensData, RawInteractionData, TimeFieldData, PRTData } from "./types";
import { joinPath, basename, dirname } from "./utils/path.js";

const OPENCODE_STORAGE_PATH = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || "";

  const paths = [
    joinPath(home, ".local", "share", "opencode", "storage", "message"),
    joinPath(home, ".opencode", "storage", "message"),
    joinPath(home, ".config", "opencode", "storage", "message")
  ];

  for (const p of paths) {
    const exists = existsSync(p);
    if (exists) {
      return p;
    }
  }

  return paths[0];
})();

const PART_STORAGE_PATH = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || "";

  const paths = [
    joinPath(home, ".local", "share", "opencode", "storage", "part"),
    joinPath(home, ".opencode", "storage", "part"),
    joinPath(home, ".config", "opencode", "storage", "part")
  ];

  for (const p of paths) {
    const exists = existsSync(p);
    if (exists) {
      return p;
    }
  }

  return paths[0];
})();

const PRICING_PATH = joinPath(process.cwd(), "config", "models.json");

function isSessionDir(dirName: string): boolean {
  return dirName.startsWith("ses_");
}

export interface OpenCodeInfo {
  storagePath: string;
  configPath: string;
  homePath: string;
  hasOpenCode: boolean;
  sessionCount: number;
}

const SESSION_FETCH_MULTIPLIER = 3;
const MAX_SESSIONS_TO_SCAN = 1000;

export class FileManager {
  async findSessions(limit?: number): Promise<string[]> {
    try {
      const sessions: string[] = [];

      try {
        const entries = await fsPromises.readdir(OPENCODE_STORAGE_PATH, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory() && isSessionDir(entry.name)) {
            sessions.push(joinPath(OPENCODE_STORAGE_PATH, entry.name));
          }
        }
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      // Use async stat for each file to avoid blocking
      const sessionsWithStats = await Promise.all(
        sessions.map(async (path) => {
          try {
            const stats = await fsPromises.stat(path);
            return { path, mtimeMs: stats.mtimeMs };
          } catch {
            return { path, mtimeMs: 0 };
          }
        })
      );

      sessionsWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

      const sortedSessions = sessionsWithStats.map(s => s.path);
      return limit ? sortedSessions.slice(0, limit) : sortedSessions;
    } catch (error) {
      console.error("Error finding sessions:", error);
      return [];
    }
  }

  async findJSONFiles(directory: string): Promise<string[]> {
    try {
      const files: string[] = [];

      try {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(joinPath(directory, entry.name));
          }
        }
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      // Use async stat for each file to avoid blocking
      const filesWithStats = await Promise.all(
        files.map(async (path) => {
          try {
            const stats = await fsPromises.stat(path);
            return { path, mtimeMs: stats.mtimeMs };
          } catch {
            return { path, mtimeMs: 0 };
          }
        })
      );

      filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

      return filesWithStats.map(f => f.path);
    } catch (error) {
      console.error(`Error finding JSON files in ${directory}:`, error);
      return [];
    }
  }

  async loadJSON<T = any>(filePath: string): Promise<T | null> {
    try {
      const file = Bun.file(filePath);
      const content = await file.text();
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`Error loading JSON from ${filePath}:`, error);
      return null;
    }
  }

  async loadPricing(): Promise<PricingData> {
    const pricing = await this.loadJSON<PricingData>(PRICING_PATH);
    return pricing || {};
  }

  parseTokenUsage(data: { tokens?: TokensData; }): TokenUsage {
    const tokensData = data.tokens || {};
    const cacheData = tokensData.cache || {};

    return {
      input: tokensData.input || 0,
      output: tokensData.output || 0,
      cache_write: cacheData.write || 0,
      cache_read: cacheData.read || 0
    };
  }

  parseTimeData(data: { time?: TimeFieldData; }): TimeData | undefined {
    if (!data.time) {
      return undefined;
    }

    return {
      created: data.time.created,
      completed: data.time.completed
    };
  }

  extractModelName(modelId: string): string {
    if (!modelId) {
      return "unknown";
    }

    let normalized = modelId.toLowerCase();

    normalized = normalized.replace(/-\d{8}$/, "");

    normalized = normalized.replace(/-(\d+)-(\d+)(?![.\d])/g, "-$1.$2");

    return normalized;
  }

  async parseInteractionFile(filePath: string, sessionId: string): Promise<InteractionFile | null> {
    const data = await this.loadJSON<RawInteractionData>(filePath);
    if (!data) {
      return null;
    }

    try {
      const modelId = this.extractModelName(data.modelID || "unknown");
      const tokens = this.parseTokenUsage(data);
      const timeData = this.parseTimeData(data);

      let projectPath: string | undefined;
      if (data.path) {
        projectPath = data.path.cwd || data.path.root;
      }

      return {
        filePath,
        sessionId,
        modelId,
        tokens,
        timeData,
        projectPath,
        rawData: data
      };
    } catch (error) {
      console.error(`Error parsing interaction file ${filePath}:`, error);
      return null;
    }
  }

  async loadSession(sessionPath: string): Promise<SessionData | null> {
    try {
      const sessionId = basename(sessionPath);
      const jsonFiles = await this.findJSONFiles(sessionPath);

      if (jsonFiles.length === 0) {
        return null;
      }

      const interactionFiles: InteractionFile[] = [];

      for (const filePath of jsonFiles) {
        const interaction = await this.parseInteractionFile(filePath, sessionId);
        if (interaction) {
          interactionFiles.push(interaction);
        }
      }

      if (interactionFiles.length === 0) {
        return null;
      }

      return {
        sessionId,
        sessionPath,
        files: interactionFiles,
        sessionTitle: undefined
      };
    } catch (error) {
      console.error(`Error loading session from ${sessionPath}:`, error);
      return null;
    }
  }

  async loadAllSessions(limit?: number): Promise<SessionData[]> {
    if (!limit) {
      const sessionPaths = await this.findSessions();
      const sessions: SessionData[] = [];

      for (const sessionPath of sessionPaths) {
        const session = await this.loadSession(sessionPath);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    }

    const sessions: SessionData[] = [];
    let pathsToCheck = limit * SESSION_FETCH_MULTIPLIER;

    let loadedCount = 0;

    while (sessions.length < limit && pathsToCheck <= MAX_SESSIONS_TO_SCAN) {
      const sessionPaths = await this.findSessions(pathsToCheck);

      for (let i = 0; i < sessionPaths.length && sessions.length < limit; i++) {
        const session = await this.loadSession(sessionPaths[i]);
        if (session) {
          sessions.push(session);
          loadedCount++;
        }
      }

      if (loadedCount < sessionPaths.length && sessions.length < limit) {
        pathsToCheck = Math.min(pathsToCheck * 2, MAX_SESSIONS_TO_SCAN + 1);
      } else {
        break;
      }
    }

    return sessions;
  }

  async getMostRecentSession(): Promise<SessionData | null> {
    const sessionPaths = await this.findSessions(1);

    if (sessionPaths.length === 0) {
      return null;
    }

    return await this.loadSession(sessionPaths[0]);
  }

  getOpenCodeStoragePath(): string {
    return OPENCODE_STORAGE_PATH;
  }

  async getOpenCodeInfo(): Promise<OpenCodeInfo> {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const storagePath = OPENCODE_STORAGE_PATH;
    const configPath = joinPath(home, ".config", "opencode");

    let sessionCount = 0;
    let hasOpenCode = false;

    try {
      await fsPromises.access(storagePath);
      hasOpenCode = true;
      const entries = await fsPromises.readdir(storagePath, { withFileTypes: true });
      sessionCount = entries.filter((e) => e.isDirectory() && isSessionDir(e.name)).length;
    } catch {
      // Directory doesn't exist
    }

    return {
      storagePath,
      configPath,
      homePath: home,
      hasOpenCode,
      sessionCount
    };
  }

  async validatePath(pathStr: string): Promise<boolean> {
    try {
      await fsPromises.access(pathStr);
      return true;
    } catch {
      return false;
    }
  }

  async loadPRTFiles(messageId: string): Promise<PRTInfo[]> {
    try {
      const messagePath = joinPath(PART_STORAGE_PATH, messageId);

      try {
        await fsPromises.access(messagePath);
      } catch {
        // Directory doesn't exist, return empty array
        return [];
      }

      const entries = await fsPromises.readdir(messagePath, { withFileTypes: true });
      const prtFiles: PRTInfo[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".json")) {
          const filePath = joinPath(messagePath, entry.name);
          const content = await this.loadJSON<PRTData>(filePath);

          if (content) {
            prtFiles.push({
              id: content.id,
              type: content.type,
              text: content.text,
              time: content.time,
              messageID: content.messageID,
              sessionID: content.sessionID,
              rawData: content
            });
          }
        }
      }

      prtFiles.sort((a, b) => {
        const timeA = a.time?.start || 0;
        const timeB = b.time?.start || 0;
        return timeA - timeB;
      });

      return prtFiles;
    } catch (error) {
      console.error(`Error loading PRT files for message ${messageId}:`, error);
      return [];
    }
  }

  getPartStoragePath(): string {
    return PART_STORAGE_PATH;
  }
}
