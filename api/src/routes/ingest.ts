import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { AppEnv } from '../types/env';
import type { ProcessedCrumbPayload } from '../types/crumb';

const ingestSchema = z.object({
  url: z.url('Must be a valid social media URL (Instagram or TikTok)'),
  guideId: z.string().optional(),
  userId: z.string().optional(),
});

export const ingestRouter = new Hono<AppEnv>();

/**
 * POST /api/ingest
 * Accepts a social media link and triggers the durable background IngestWorkflow.
 * Returns 202 Accepted immediately.
 */
ingestRouter.post('/', zValidator('json', ingestSchema), async (c) => {
  const { url, guideId, userId } = c.req.valid('json');

  try {
    const instance = await c.env.INGEST_WORKFLOW.create({
      params: {
        url,
        guideId,
        userId,
      },
    });

    return c.json(
      {
        success: true,
        workflowId: instance.id,
        status: 'queued',
        message: 'Ingestion workflow dispatched successfully',
      },
      202,
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to trigger ingestion';
    console.error('[Ingest Trigger Error]:', error);
    return c.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});

/**
 * GET /api/ingest/:instanceId
 * Checks the execution status and output of a queued ingestion workflow instance.
 */
ingestRouter.get('/:instanceId', async (c) => {
  const instanceId = c.req.param('instanceId');

  try {
    const instance = await c.env.INGEST_WORKFLOW.get(instanceId);
    const status = await instance.status();

    return c.json({
      success: true,
      workflowId: instanceId,
      status: status.status,
      output: (status.output as ProcessedCrumbPayload) ?? null,
      error: status.error ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Workflow instance not found';
    return c.json(
      {
        success: false,
        error: message,
      },
      404,
    );
  }
});
