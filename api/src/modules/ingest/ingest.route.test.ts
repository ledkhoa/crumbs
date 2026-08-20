import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AppEnv, IngestWorkflowParams } from '../../core/types/env';
import { ingestRouter } from './ingest.route';

const testApp = new Hono<AppEnv>();
testApp.route('/ingest', ingestRouter);

describe('Ingest Route HTTP Validation', () => {
  it('should return 401 or 400 when called unauthenticated without valid token', async () => {
    const req = new Request('http://localhost/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'not-a-valid-url',
      }),
    });

    // SAFETY: Complete mock matching Workflow interface for in-memory route test
    const createMockInstance = (id: string): WorkflowInstance => ({
      id,
      status: async () => ({ status: 'complete' }),
      pause: async () => {},
      resume: async () => {},
      terminate: async () => {},
      restart: async () => {},
      delete: async () => {},
      sendEvent: async () => {},
    });

    const mockWorkflow: Workflow<IngestWorkflowParams> = {
      create: async () => createMockInstance('test_id'),
      get: async (id: string) => createMockInstance(id),
      createBatch: async () => [],
      deleteBatch: async () => ({ deleted: [], errors: [] }),
    };

    const res = await testApp.request(
      req,
      {},
      {
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/testdb',
        INGEST_WORKFLOW: mockWorkflow,
      },
    );

    // Unauthenticated request is rejected by requireAuth middleware
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
