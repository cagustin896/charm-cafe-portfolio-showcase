import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = join(process.cwd(), "dist");
const port = Number(process.env.PORT || 5173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

if (!existsSync(root)) {
  console.error("Missing dist folder. Run npm.cmd run build first.");
  process.exit(1);
}

createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://127.0.0.1:${port}`).pathname);
  const requested = normalize(join(root, urlPath === "/" ? "index.html" : urlPath));
  const filePath = requested.startsWith(root) && existsSync(requested) && statSync(requested).isFile()
    ? requested
    : join(root, "index.html");

  response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Charm Cafe Manager running at http://127.0.0.1:${port}`);
});
