import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { config } from './config/env';
import { initRedis } from './services/redisService';
import { initEmailWorker } from './queue/emailWorker';
import { getEmailQueue } from './queue/emailQueue';
import { initElasticsearch } from './services/elasticsearchService';

import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import statsRoutes from './routes/statsRoutes';

async function bootstrap() {
  const app = express();

  // Middleware
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 1. Initialize Redis (with auto fallback to memory server)
  await initRedis();

  // 2. Initialize BullMQ Worker Pool
  initEmailWorker();

  // 3. Initialize BullMQ Dashboard UI (@bull-board/express)
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queue = getEmailQueue();
  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // 4. Initialize Elasticsearch Connection
  await initElasticsearch();

  // 5. Mount API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);
  app.use('/api/stats', statsRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Start Server
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 ReachInbox Backend API running on http://localhost:${config.port}`);
    console.log(`📊 BullMQ Live Queue Dashboard: http://localhost:${config.port}/admin/queues`);
    console.log(`=======================================================`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error in backend server:', err);
  process.exit(1);
});
