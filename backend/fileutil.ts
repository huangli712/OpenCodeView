import { existsSync } from "node:fs";
import { promises as fsPromises } from "node:fs";
import type {
    TokenUsage,
    TimeData,
    InteractionFile,
    SessionData,
    PricingData,
    PRTInfo,
    TokensData,
    RawInteractionData,
    TimeFieldData,
    PRTData,
    OpenCodeInfo
} from "./types";

const SESSION_FETCH_MULTIPLIER = 3;
const MAX_SESSIONS_TO_SCAN = 1000;

// Resolve OpenCode storage path (try multiple locations)
const OPENCODE_STORAGE_PATH = (() => {
    const home = process.env.HOME || process.env.USERPROFILE || "";

    const paths: string[] = [];

    if (process.env.OPCODE_STORAGE_PATH) {
        paths.push(process.env.OPCODE_STORAGE_PATH);
    }

    paths.push(
        joinPath(home, ".local", "share", "opencode", "storage",
            "message"),
        joinPath(home, ".opencode", "storage", "message"),
        joinPath(home, ".config", "opencode", "storage", "message")
    );

    for (const p of paths) {
        const exists = existsSync(p);
        if (exists) {
            return p;
        }
    }

    return paths[0];
})();

// Resolve OpenCode PRT/part storage path (try multiple locations)
const PART_STORAGE_PATH = (() => {
    const home = process.env.HOME || process.env.USERPROFILE || "";

    const paths = [
        joinPath(home, ".local", "share", "opencode", "storage",
            "part"),
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

// Check if directory name matches session pattern
function isSessionDir(dirName: string): boolean {
    return dirName.startsWith("ses_");
}

// Joins path parts into a single path string
export function joinPath(...parts: string[]): string {
    return parts.filter((p) => p).join("/");
}

// Extracts filename from a path
export function basename(path: string): string {
    return path.split("/").pop() || "";
}

// Extracts directory path from a path
export function dirname(path: string): string {
    const parts = path.split("/");
    parts.pop();
    return parts.join("/") || "/";
}

// Find all session directories sorted by modification time
export async function findSessions(
    limit?: number
): Promise<string[]> {
    try {
        const sessions: string[] = [];

        try {
            const entries = await fsPromises.readdir(
                OPENCODE_STORAGE_PATH,
                { withFileTypes: true }
            );

            for (const entry of entries) {
                if (entry.isDirectory() &&
                    isSessionDir(entry.name)) {
                    const sessionPath = joinPath(
                        OPENCODE_STORAGE_PATH,
                        entry.name
                    );
                    try {
                        const files = await fsPromises.readdir(
                            sessionPath
                        );
                        if (files.length > 0) {
                            sessions.push(sessionPath);
                        }
                    } catch (error) {
                        // Expected for inaccessible directories
                        if (error.code !== 'EACCES' &&
                            error.code !== 'EPERM') {
                            console.error(
                                "Error reading session " +
                                `directory ${sessionPath}:`,
                                error
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error(
                "Error reading OpenCode storage directory:",
                error
            );
            return [];
        }

        const sessionsWithStats = await Promise.all(
            sessions.map(async (path) => {
                try {
                    const stats = await fsPromises.stat(path);
                    return { path, mtimeMs: stats.mtimeMs };
                } catch (error) {
                    console.error(
                        `Error getting stats for ${path}:`,
                        error
                    );
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

// Find JSON files sorted by modification time
export async function findJSONFiles(
    directory: string
): Promise<string[]> {
    try {
        const files: string[] = [];

        try {
            const entries = await fsPromises.readdir(directory,
                { withFileTypes: true }
            );

            for (const entry of entries) {
                if (entry.isFile() &&
                    entry.name.endsWith(".json")) {
                    files.push(joinPath(directory, entry.name));
                }
            }
        } catch (error) {
            // Directory doesn't exist, return empty array
            if (error.code !== 'ENOENT') {
                console.error(
                    `Error reading directory ${directory}:`,
                    error
                );
            }
            return [];
        }

        // Use async stat for each file to avoid blocking
        const filesWithStats = await Promise.all(
            files.map(async (path) => {
                try {
                    const stats = await fsPromises.stat(path);
                    return { path, mtimeMs: stats.mtimeMs };
                } catch (error) {
                    console.error(
                        `Error getting stats for ${path}:`,
                        error
                    );
                    return { path, mtimeMs: 0 };
                }
            })
        );

        filesWithStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

        return filesWithStats.map(f => f.path);
    } catch (error) {
        console.error(
            `Error finding JSON files in ${directory}:`,
            error
        );
        return [];
    }
}

// Load and parse JSON file
export async function loadJSON<T = any>(
    filePath: string
): Promise<T | null> {
    try {
        const file = Bun.file(filePath);
        const content = await file.text();
        return JSON.parse(content) as T;
    } catch (error) {
        console.error(
            `Error loading JSON from ${filePath}:`,
            error
        );
        return null;
    }
}

// Load pricing configuration from models.json
export async function loadPricing(): Promise<PricingData> {
    const pricing = await loadJSON<PricingData>(PRICING_PATH);
    return pricing || {};
}

// Extract token usage from interaction data
export function parseTokenUsage(
    data: { tokens?: TokensData; }
): TokenUsage {
    const tokensData = data.tokens || {};
    const cacheData = tokensData.cache || {};

    return {
        input: tokensData.input || 0,
        output: tokensData.output || 0,
        cache_write: cacheData.write || 0,
        cache_read: cacheData.read || 0
    };
}

// Extract time data from interaction
export function parseTimeData(
    data: { time?: TimeFieldData; }
): TimeData | undefined {
    if (!data.time) {
        return undefined;
    }

    return {
        created: data.time.created,
        completed: data.time.completed
    };
}

// Normalize model ID for pricing lookup
export function extractModelName(modelId: string): string {
    if (!modelId) {
        return "unknown";
    }

    let normalized = modelId.toLowerCase();

    normalized = normalized.replace(/-\d{8}$/, "");

    normalized = normalized.replace(
        /-(\d+)-(\d+)(?![.\d])/g,
        "-$1.$2"
    );

    return normalized;
}

// Parse interaction file into structured data
export async function parseInteractionFile(
    filePath: string,
    sessionId: string
): Promise<InteractionFile | null> {
    const data = await loadJSON<RawInteractionData>(filePath);
    if (!data) {
        return null;
    }

    try {
        const modelId = extractModelName(
            data.modelID || data.model?.modelID || "unknown"
        );
        const tokens = parseTokenUsage(data);
        const timeData = parseTimeData(data);

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
        console.error(
            `Error parsing interaction file ${filePath}:`,
            error
        );
        return null;
    }
}

// Load session data from directory
export async function loadSession(
    sessionPath: string
): Promise<SessionData | null> {
    try {
        const sessionId = basename(sessionPath);
        const jsonFiles = await findJSONFiles(sessionPath);

        if (jsonFiles.length === 0) {
            return null;
        }

        const interactionFiles: InteractionFile[] = [];

        for (const filePath of jsonFiles) {
            const interaction = await parseInteractionFile(
                filePath,
                sessionId
            );
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
        console.error(
            `Error loading session from ${sessionPath}:`,
            error
        );
        return null;
    }
}

// Load sessions with optional limit
export async function loadAllSessions(
    limit?: number
): Promise<SessionData[]> {
    if (!limit) {
        const sessionPaths = await findSessions();
        const sessions: SessionData[] = [];

        for (const sessionPath of sessionPaths) {
            const session = await loadSession(sessionPath);
            if (session) {
                sessions.push(session);
            }
        }

        return sessions;
    }

    const sessions: SessionData[] = [];
    let pathsToCheck = limit * SESSION_FETCH_MULTIPLIER;

    let loadedCount = 0;

    while (sessions.length < limit &&
        pathsToCheck <= MAX_SESSIONS_TO_SCAN) {
        const sessionPaths = await findSessions(pathsToCheck);

        for (let i = 0;
            i < sessionPaths.length &&
            sessions.length < limit;
            i++) {
            const session = await loadSession(
                sessionPaths[i]
            );
            if (session) {
                sessions.push(session);
                loadedCount++;
            }
        }

        if (loadedCount < sessionPaths.length &&
            sessions.length < limit) {
            pathsToCheck = Math.min(
                pathsToCheck * 2,
                MAX_SESSIONS_TO_SCAN + 1
            );
        } else {
            break;
        }
    }

    return sessions;
}

// Get most recently modified session
export async function getMostRecentSession():
    Promise<SessionData | null> {
    const sessionPaths = await findSessions(1);

    if (sessionPaths.length === 0) {
        return null;
    }

    return await loadSession(sessionPaths[0]);
}

export function getOpenCodeStoragePath(): string {
    return OPENCODE_STORAGE_PATH;
}

// Get OpenCode installation info
export async function getOpenCodeInfo(): Promise<OpenCodeInfo> {
    const home = process.env.HOME || process.env.USERPROFILE || "";
    const storagePath = OPENCODE_STORAGE_PATH;
    const configPath = joinPath(home, ".config", "opencode");

    let sessionCount = 0;
    let hasOpenCode = false;

    try {
        await fsPromises.access(storagePath);
        hasOpenCode = true;
        const entries = await fsPromises.readdir(
            storagePath,
            { withFileTypes: true }
        );
        sessionCount = entries.filter(
            (e) => e.isDirectory() && isSessionDir(e.name)
        ).length;
    } catch (error) {
        // Directory doesn't exist or is inaccessible
        if (error.code !== 'ENOENT' &&
            error.code !== 'EACCES') {
            console.error(
                "Error accessing OpenCode storage:",
                error
            );
        }
    }

    return {
        storagePath,
        configPath,
        homePath: home,
        hasOpenCode,
        sessionCount
    };
}

// Check if path exists
export async function validatePath(
    pathStr: string
): Promise<boolean> {
    try {
        await fsPromises.access(pathStr);
        return true;
    } catch (error) {
        // Expected when path doesn't exist
        if (error.code !== 'ENOENT' &&
            error.code !== 'EACCES') {
            console.error(
                `Error validating path ${pathStr}:`,
                error
            );
        }
        return false;
    }
}

// Load PRT (part) files for message
export async function loadPRTFiles(
    messageId: string
): Promise<PRTInfo[]> {
    try {
        const messagePath = joinPath(PART_STORAGE_PATH, messageId);

        try {
            await fsPromises.access(messagePath);
        } catch (error) {
            // Directory doesn't exist, return empty array
            if (error.code !== 'ENOENT') {
                console.error(
                    "Error accessing message path " +
                    `${messagePath}:`,
                    error
                );
            }
            return [];
        }

        const entries = await fsPromises.readdir(
            messagePath,
            { withFileTypes: true }
        );
        const prtFiles: PRTInfo[] = [];

        for (const entry of entries) {
            if (entry.isFile() && entry.name.endsWith(".json")) {
                const filePath = joinPath(messagePath,
                    entry.name
                );
                const content = await loadJSON<PRTData>(filePath);

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
        console.error(
            `Error loading PRT files for message ${messageId}:`,
            error
        );
        return [];
    }
}

// Get OpenCode part storage path
export function getPartStoragePath(): string {
    return PART_STORAGE_PATH;
}
