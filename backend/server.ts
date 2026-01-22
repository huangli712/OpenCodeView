import { serve } from "bun";
import { resolve, normalize } from "node:path";
import type { SessionData } from "./types";

import { handleGetSessions, handleGetSessionById, handleGetMostRecent, handleGetAnalytics, handleGetSummary, handleValidate, handleGetOpenCodeInfo } from "./routes";
import { FileManager } from "./fileutil";
import { Sessions } from "./sessions";

// Path utility functions - standard JavaScript implementation
function joinPath(...parts: string[]): string {
  return parts.filter((p) => p).join("/");
}

const PORT = parseInt(process.env.PORT || "3000");

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
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

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

    try {
      if (url.pathname.startsWith("/api/")) {
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

console.log(`🚀 OpenCodeView server running on http://localhost:${PORT}`);
console.log(`📁 OpenCode storage path: ${new FileManager().getOpenCodeStoragePath()}`);

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
