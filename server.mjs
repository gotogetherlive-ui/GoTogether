import cluster from 'cluster';
import os from 'os';
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function integerSetting(name, fallback, minimum, maximum) {
  const value = Number.parseInt(process.env[name] || String(fallback), 10);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

const port = integerSetting('PORT', 3000, 1, 65535);

if (cluster.isPrimary) {
  const numCPUs = Math.min(integerSetting('WEB_CONCURRENCY', 4, 1, 64), os.availableParallelism?.() || os.cpus().length);
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
    setTimeout(() => process.exit(1), 30_000).unref();
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
    server.keepAliveTimeout = integerSetting('HTTP_KEEP_ALIVE_TIMEOUT_MS', 65_000, 1_000, 300_000);
    server.headersTimeout = integerSetting('HTTP_HEADERS_TIMEOUT_MS', 66_000, server.keepAliveTimeout + 1_000, 310_000);
    server.requestTimeout = integerSetting('HTTP_REQUEST_TIMEOUT_MS', 30_000, 1_000, 300_000);
    server.maxRequestsPerSocket = integerSetting('HTTP_MAX_REQUESTS_PER_SOCKET', 1_000, 1, 100_000);
    server.maxHeadersCount = integerSetting('HTTP_MAX_HEADERS_COUNT', 100, 20, 2_000);
    server.on('clientError', (_error, socket) => socket.destroy());
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
