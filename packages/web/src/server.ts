import app from "./api";

const port = Number(process.env.PORT ?? 3000);
const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;

// MIME type map — critical for browser to execute ES modules
const MIME_TYPES: Record<string, string> = {
  ".js":    "application/javascript; charset=utf-8",
  ".mjs":   "application/javascript; charset=utf-8",
  ".css":   "text/css; charset=utf-8",
  ".html":  "text/html; charset=utf-8",
  ".json":  "application/json; charset=utf-8",
  ".svg":   "image/svg+xml",
  ".png":   "image/png",
  ".jpg":   "image/jpeg",
  ".jpeg":  "image/jpeg",
  ".webp":  "image/webp",
  ".ico":   "image/x-icon",
  ".woff":  "font/woff",
  ".woff2": "font/woff2",
  ".ttf":   "font/ttf",
  ".mp4":   "video/mp4",
  ".webm":  "video/webm",
  ".mp3":   "audio/mpeg",
  ".wav":   "audio/wav",
};

function getMimeType(pathname: string): string {
  const ext = pathname.substring(pathname.lastIndexOf(".")).toLowerCase();
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0", // bind to all interfaces — required for Render load balancer
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const contentType = getMimeType(filePath);
      const headers: Record<string, string> = { "Content-Type": contentType };
      // Immutable cache for hashed assets
      if (url.pathname.startsWith("/assets/")) {
        headers["Cache-Control"] = "public, max-age=31536000, immutable";
      }
      return new Response(file, { headers });
    }

    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on http://localhost:${server.port}`);

// Self-ping every 10 minutes to prevent Render free tier cold starts
const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${server.port}`;
setInterval(async () => {
  try {
    await fetch(`${SELF_URL}/api/ping`, { signal: AbortSignal.timeout(5000) });
  } catch { /* silent — just keeping the server warm */ }
}, 10 * 60 * 1000);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}
