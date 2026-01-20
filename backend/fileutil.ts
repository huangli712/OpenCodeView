import path from "node:path";
import { existsSync, readdirSync, lstatSync } from "node:fs";
import type { TokenUsage, TimeData, InteractionFile, SessionData, PricingData, PRTInfo } from "./types";

const OPENCODE_STORAGE_PATH = (() => {
  const home = process.env.HOME || process.env.USERPROFILE || "";

  const paths = [
    path.join(home, ".local", "share", "opencode", "storage", "message"),
    path.join(home, ".opencode", "storage", "message"),
    path.join(home, ".config", "opencode", "storage", "message"),
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
    path.join(home, ".local", "share", "opencode", "storage", "part"),
    path.join(home, ".opencode", "storage", "part"),
    path.join(home, ".config", "opencode", "storage", "part"),
  ];

  for (const p of paths) {
    const exists = existsSync(p);
    if (exists) {
      return p;
    }
  }

  return paths[0];
})();

const PRICING_PATH = path.join(process.cwd(), "config", "models.json");

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

export class FileManager {
  async findSessions(limit?: number): Promise<string[]> {
    try {
      const sessions: string[] = [];

      if (existsSync(OPENCODE_STORAGE_PATH)) {
        const entries = readdirSync(OPENCODE_STORAGE_PATH, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory() && isSessionDir(entry.name)) {
            sessions.push(path.join(OPENCODE_STORAGE_PATH, entry.name));
          }
      }
    }

    sessions.sort((a, b) => {
      const mtA = lstatSync(a).mtimeMs;
      const mtB = lstatSync(b).mtimeMs;
      return mtB - mtA;
    });

    return limit ? sessions.slice(0, limit) : sessions;
    } catch (error) {
      console.error("Error finding sessions:", error);
      return [];
    }
  }

  async findJSONFiles(directory: string): Promise<string[]> {
    try {
      const files: string[] = [];

      if (existsSync(directory)) {
        const entries = readdirSync(directory, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isFile() && entry.name.endsWith(".json")) {
            files.push(path.join(directory, entry.name));
          }
        }
      }

    files.sort((a, b) => {
      const mtA = lstatSync(a).mtimeMs;
      const mtB = lstatSync(b).mtimeMs;
      return mtB - mtA;
    });

    return files;
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

  parseTokenUsage(data: any): TokenUsage {
    const tokensData = data.tokens || {};
    const cacheData = tokensData.cache || {};

    return {
      input: tokensData.input || 0,
      output: tokensData.output || 0,
      cache_write: cacheData.write || 0,
      cache_read: cacheData.read || 0
    };
  }

  parseTimeData(data: any): TimeData | undefined {
    if (!data.time) return undefined;

    return {
      created: data.time.created,
      completed: data.time.completed
    };
  }

  extractModelName(modelId: string): string {
    if (!modelId) return "unknown";
    
    let normalized = modelId.toLowerCase();

    normalized = normalized.replace(/-\d{8}$/, "");

    normalized = normalized.replace(/-(\d+)-(\d+)(?![.\d])/g, "-$1.$2");

    return normalized;
  }

  async parseInteractionFile(filePath: string, sessionId: string): Promise<InteractionFile | null> {
    const data = await this.loadJSON(filePath);
    if (!data) return null;

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
      const sessionId = path.basename(sessionPath);
      const jsonFiles = await this.findJSONFiles(sessionPath);

      if (jsonFiles.length === 0) {
        return null;
      }

      const interactionFiles: InteractionFile[] = [];
      
      for (const filePath of jsonFiles) {
        const interaction = await this.parseInteractionFile(filePath, sessionId);
        if (interaction) {
          const totalTokens = interaction.tokens.input + 
                            interaction.tokens.output + 
                            interaction.tokens.cache_write + 
                            interaction.tokens.cache_read;
          
          if (totalTokens > 0) {
            interactionFiles.push(interaction);
          }
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
    let pathsToCheck = limit * 3;
    const maxPaths = 1000;

    while (sessions.length < limit && pathsToCheck <= maxPaths) {
      const sessionPaths = await this.findSessions(pathsToCheck);

      for (let i = sessions.length; i < sessionPaths.length && sessions.length < limit; i++) {
        const session = await this.loadSession(sessionPaths[i]);
        if (session) {
          sessions.push(session);
        }
      }

      if (sessionPaths.length < pathsToCheck) {
        break;
      }

      pathsToCheck *= 2;
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
    const configPath = path.join(home, ".config", "opencode");

    let sessionCount = 0;
    if (existsSync(storagePath)) {
      const entries = readdirSync(storagePath, { withFileTypes: true });
      sessionCount = entries.filter(e => e.isDirectory() && isSessionDir(e.name)).length;
    }

    return {
      storagePath,
      configPath,
      homePath: home,
      hasOpenCode: existsSync(storagePath),
      sessionCount
    };
  }

  async validatePath(pathStr: string): Promise<boolean> {
    return existsSync(pathStr);
  }

  async loadPRTFiles(messageId: string): Promise<PRTInfo[]> {
    try {
      const messagePath = path.join(PART_STORAGE_PATH, messageId);

      if (!existsSync(messagePath)) {
        return [];
      }

      const entries = readdirSync(messagePath, { withFileTypes: true });
      const prtFiles: PRTInfo[] = [];

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.json')) {
          const filePath = path.join(messagePath, entry.name);
          const content = await this.loadJSON<any>(filePath);

          if (content) {
            prtFiles.push({
              id: content.id,
              type: content.type,
              text: content.text,
              synthetic: content.synthetic,
              time: content.time,
              messageID: content.messageID,
              sessionID: content.sessionID
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
