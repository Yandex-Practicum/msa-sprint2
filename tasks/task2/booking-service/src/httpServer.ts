import http from "http";

export function startHttpServer(): void {
  const port = Number(process.env.HTTP_PORT ?? 8080);
  const version = process.env.APP_VERSION ?? "unknown";

  const server = http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/ping") {
      res.setHeader("X-App-Version", version);
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("pong");
      return;
    }
    res.writeHead(404);
    res.end();
  });

  server.listen(port, () => {
    console.log(`booking-service: HTTP /ping listening on :${port} (version=${version})`);
  });
}
