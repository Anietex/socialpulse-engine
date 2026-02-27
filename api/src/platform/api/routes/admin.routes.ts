/**
 * Admin Routes
 * Bull Board UI for queue monitoring
 */

import { Router } from 'express';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import type { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';
import { queues } from '../../infrastructure/queue/queues';

/**
 * Create admin routes with Bull Board
 */
export function createAdminRoutes(): Router {
  const router = Router();

  // Setup Bull Board adapter
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Create Bull Board with type casting
  const queueAdapters: BaseAdapter[] = Object.values(queues).map(
    (queue) => new BullMQAdapter(queue) as unknown as BaseAdapter
  );

  createBullBoard({
    queues: queueAdapters,
    serverAdapter,
  });

  // Mount Bull Board routes
  router.use('/queues', serverAdapter.getRouter());

  return router;
}
