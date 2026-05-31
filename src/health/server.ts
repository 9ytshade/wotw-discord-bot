import http from "node:http";
import { config } from "../config/config";

export function startHealthServer(): http.Server {
  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
      return;
    }

    response.writeHead(200, { "content-type": "text/plain" });
    response.end("WOTW Discord Bot is running.");
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log(`Health server listening on port ${config.port}.`);
  });

  return server;
}
