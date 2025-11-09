import http from 'http';

const PORT = process.env.PORT || 8080;
const ENABLE_FEATURE_X = (process.env.ENABLE_FEATURE_X || 'false').toLowerCase() === 'true';

const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    const payload = ENABLE_FEATURE_X
      ? { status: 'ok', featureX: true, ts: new Date().toISOString() }
      : { status: 'ok' };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
    return;
  }
  if (req.url === '/ready') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ready');
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Service started on :${PORT}, featureX=${ENABLE_FEATURE_X}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});