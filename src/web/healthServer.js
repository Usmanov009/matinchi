import http from "node:http";
import { logger } from "../utils/logger.js";

// Render (and similar PaaS "Web Service" plans) require the process to bind
// a port, even though this bot only does outbound long-polling to Telegram.
// This is a minimal health-check endpoint to satisfy that port scan.
export function startHealthServer() {
  const port = process.env.PORT ?? 3000;

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK");
  });

  server.listen(port, () => {
    logger.info(`Health check server listening on port ${port}`);
  });

  return server;
}
