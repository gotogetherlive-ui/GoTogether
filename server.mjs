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
  console.log(`[Primary] Master process ${process.pid} is running.`);
  console.log(`[Primary] Spawning ${numCPUs} clustered server workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker) => {
    console.log(`[Primary] Worker process ${worker.process.pid} exited. Restarting worker...`);
    cluster.fork();
  });
} else {
  const dev = process.env.NODE_ENV === 'development';
  const app = next({ dev, dir: __dirname });
  const handle = app.getRequestHandler();

  app.prepare().then(() => {
    createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, () => {
      console.log(`[Worker ${process.pid}] Ready on http://localhost:${port}`);
    });
  }).catch((err) => {
    console.error(`[Worker ${process.pid}] Failed to start:`, err);
    process.exit(1);
  });
}
