import cluster from 'cluster';
import os from 'os';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = parseInt(process.env.PORT || '3000', 10);

if (cluster.isPrimary) {
  const numCPUs = Math.max(1, Math.min(parseInt(process.env.WEB_CONCURRENCY || '4', 10), os.cpus().length));
  let shuttingDown = false;
  console.log(`[Primary] Master process ${process.pid} is running.`);
  console.log(`[Primary] Spawning ${numCPUs} clustered server workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    if (!shuttingDown) {
      console.log(`[Primary] Worker process ${worker.process.pid} exited. Restarting worker...`);
      cluster.fork();
    }
  });

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('[Primary] Gracefully stopping workers...');
    cluster.disconnect(() => process.exit(0));
    setTimeout(() => process.exit(1), 15_000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
} else {
  const dev = process.env.NODE_ENV === 'development';
  const app = next({ dev, dir: __dirname });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });
    server.keepAliveTimeout = parseInt(process.env.HTTP_KEEP_ALIVE_TIMEOUT_MS || '65000', 10);
    server.headersTimeout = parseInt(process.env.HTTP_HEADERS_TIMEOUT_MS || '66000', 10);
    server.requestTimeout = parseInt(process.env.HTTP_REQUEST_TIMEOUT_MS || '30000', 10);
    server.maxRequestsPerSocket = parseInt(process.env.HTTP_MAX_REQUESTS_PER_SOCKET || '1000', 10);
    server.listen(port, () => {
      console.log(`[Worker ${process.pid}] Ready on http://localhost:${port}`);
    });

    const shutdown = () => {
      server.close(() => process.exit(0));
      server.closeIdleConnections();
      setTimeout(() => {
        server.closeAllConnections();
        process.exit(1);
      }, 10_000).unref();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }).catch((err) => {
    console.error(`[Worker ${process.pid}] Failed to start:`, err);
    process.exit(1);
  });
}
