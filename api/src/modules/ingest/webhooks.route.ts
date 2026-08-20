import { Hono } from 'hono';
import type { AppEnv } from '../../core/types/env';

export const webhooksRouter = new Hono<AppEnv>();

/**
 * POST /webhooks/apify
 * Webhook receiver for Apify Actor run completion events.
 * Forwards completion event to the hibernated Cloudflare Workflow instance to resume execution immediately.
 */
webhooksRouter.post('/apify', async (c) => {
  const workflowId = c.req.query('workflowId');
  const token = c.req.query('token');

  // Verify webhook secret token if configured
  if (c.env.APIFY_WEBHOOK_SECRET && token !== c.env.APIFY_WEBHOOK_SECRET) {
    console.warn('[Webhook /apify]: Rejected unauthorized webhook request');
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  if (!workflowId) {
    console.warn('[Webhook /apify]: Missing workflowId query parameter');
    return c.json(
      { success: false, error: 'Missing workflowId query parameter' },
      400,
    );
  }

  try {
    // SAFETY: Webhook payload structure sent from Apify is parsed as partial ApifyWebhookPayload
    const payload = (await c.req.json().catch(() => ({}))) as {
      eventType?: string;
      eventData?: {
        actorRunId?: string;
        status?: string;
        defaultDatasetId?: string;
      };
    };

    console.log(
      `\n🪝 [Webhook /apify RECEIVED] Resuming workflow instance: ${workflowId}`,
    );
    console.log(`   Event Type: ${payload.eventType || 'Unknown'}`);
    console.log(
      `   Status:     ${payload.eventData?.status || payload.eventType || 'SUCCESS'}`,
    );

    const instance = await c.env.INGEST_WORKFLOW.get(workflowId);

    // Send the resume event to wake up step.waitForEvent()
    await instance.sendEvent({
      type: 'apify-scrape-complete',
      payload: {
        status: payload.eventData?.status || 'SUCCEEDED',
        actorRunId: payload.eventData?.actorRunId,
        defaultDatasetId: payload.eventData?.defaultDatasetId,
      },
    });

    return c.json({
      success: true,
      message: 'Workflow event dispatched successfully',
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to deliver event to workflow';
    console.error(`[Webhook /apify Error]: ${message}`, error);
    return c.json(
      {
        success: false,
        error: message,
      },
      500,
    );
  }
});
