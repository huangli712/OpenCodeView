import { serve } from "bun";
import { resolve, normalize } from "node:path";
import {
    joinPath,
    getOpenCodeStoragePath
} from "./fileutil";
import {
    handleGetSessions,
    handleGetSessionById,
    handleGetMostRecent,
    handleGetAnalytics,
    handleGetSummary,
    handleValidate,
    handleGetOpenCodeInfo
} from "./routes";

const DEFAULT_PORT = 3000;
const MAX_PORT = 65535;
const MIN_PORT = 1;
const MAX_REQUEST_SIZE = 10 * 1024 * 1024;

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // Max 100 requests per minute per IP

type RequestLog = {
    count: number;
    resetTime: number;
};

const ipRequestLog = new Map<string, RequestLog>();

const PORT = (() => {
    const port = parseInt(
        process.env.PORT || `${DEFAULT_PORT}`,
        10
    );
    if (isNaN(port) || port < MIN_PORT || port > MAX_PORT) {
        console.warn(
            `Invalid PORT value: ${process.env.PORT}, ` +
            `using ${DEFAULT_PORT}`
        );
        return DEFAULT_PORT;
    }
    return port;
})();

// Get MIME content type based on file extension
function getContentType(pathname: string): string {
    const ext = pathname.split(".").pop()?.toLowerCase();

    const types: Record<string, string> = {
        "html": "text/html; charset=utf-8",
        "css": "text/css; charset=utf-8",
        "js": "text/javascript; charset=utf-8",
        "json": "application/json; charset=utf-8",
        "ico": "image/x-icon",
        "svg": "image/svg+xml",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg"
    };

    return types[ext || ""] || "application/octet-stream";
}

// Check if request is within rate limit per IP
function checkRateLimit(req: Request): boolean {
    const ip = req.headers.get("x-forwarded-for") ||
        req.headers.get("x-real-ip") ||
        "unknown";

    const now = Date.now();
    const log = ipRequestLog.get(ip);

    if (!log || now >= log.resetTime + RATE_LIMIT_WINDOW_MS) {
        ipRequestLog.set(ip, { count: 1, resetTime: now });
        return true;
    }

    if (log.count >= RATE_LIMIT_MAX_REQUESTS) {
        return false;
    }

    log.count++;
    return true;
}

// Serve static files from frontend directory
async function handleStatic(req: Request, url: URL): Promise<Response> {
    let pathname = url.pathname;
    if (pathname === "/") {
        pathname = "/index.html";
    }

    const frontendDir = resolve(process.cwd(), "frontend");
    const filePath = normalize(joinPath(frontendDir, pathname));

    // Security check: prevent directory traversal
    if (!filePath.startsWith(frontendDir)) {
        return new Response("Forbidden", { status: 403 });
    }

    const file = Bun.file(filePath);

    try {
        const exists = await file.exists();
        if (!exists) {
            return new Response("Not Found", { status: 404 });
        }

        const response = new Response(file);
        response.headers.set("Content-Type", getContentType(pathname));
        return response;
    } catch (error) {
        console.error(`Error serving static file ${pathname}:`, error);
        return new Response("Not Found", { status: 404 });
    }
}

// Route API requests to appropriate handlers
async function handleAPI(req: Request, url: URL): Promise<Response> {
    const pathname = url.pathname;

    if (pathname === "/api/sessions" && req.method === "GET") {
        return handleGetSessions(req, url);
    }

    if (pathname.startsWith("/api/sessions/") && req.method === "GET") {
        return handleGetSessionById(req, url);
    }

    if (pathname === "/api/sessions/recent" && req.method === "GET") {
        return handleGetMostRecent(req);
    }

    if (pathname === "/api/analytics" && req.method === "GET") {
        return handleGetAnalytics(req, url);
    }

    if (pathname === "/api/summary" && req.method === "GET") {
        return handleGetSummary(req);
    }

    if (pathname === "/api/validate" && req.method === "GET") {
        return handleValidate(req);
    }

    if (pathname === "/api/opencode" && req.method === "GET") {
        return handleGetOpenCodeInfo(req);
    }

    return new Response("Not Found", { status: 404 });
}

const server = serve({
    port: PORT,
    fetch(req: Request) {
        const url = new URL(req.url);

        console.log(`${req.method} ${url.pathname}`);

        const contentLength = req.headers.get("content-length");
        if (contentLength &&
            parseInt(contentLength, 10) > MAX_REQUEST_SIZE) {

            return new Response("Request body too large", { status: 413 });
        }

        try {
            if (url.pathname.startsWith("/api/")) {
                if (!checkRateLimit(req)) {
                    return new Response(
                        "Too many requests. Please try again later.",
                        {
                            status: 429,
                            headers: {
                                "Content-Type": "application/json",
                                "Retry-After": `${
                                    Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)
                                }`
                            }
                        }
                    );
                }

                return handleAPI(req, url);
            }

            return handleStatic(req, url);
        } catch (error) {
            console.error("Error handling request:", error);
            return new Response(JSON.stringify({
                success: false,
                error: "Internal server error"
            }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        }
    },
    error(error) {
        console.error("Server error:", error);
    }
});

console.log(
    `🚀 OpenCodeView server running on ` +
    `http://localhost:${PORT}`
);
console.log(`📁 OpenCode storage path: ${getOpenCodeStoragePath()}`);

process.on("SIGINT", () => {
    console.log("\n👋 Shutting down gracefully...");
    server.stop();
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n👋 Shutting down gracefully...");
    server.stop();
    process.exit(0);
});
