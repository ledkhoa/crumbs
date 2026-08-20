import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AppEnv } from '../../core/types/env';
import { guidesRouter } from './guides.route';

const testApp = new Hono<AppEnv>();
testApp.route('/guides', guidesRouter);

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

const mockWorkflow: AppEnv['Bindings']['INGEST_WORKFLOW'] = {
  create: async () => createMockInstance('test_id'),
  get: async (id: string) => createMockInstance(id),
  createBatch: async () => [],
  deleteBatch: async () => ({ deleted: [], errors: [] }),
};

describe('Guides Route HTTP & Auth Validation', () => {
  it('should reject unauthenticated GET /guides with 401/400', async () => {
    const req = new Request('http://localhost/guides', {
      method: 'GET',
    });

    const res = await testApp.request(
      req,
      {},
      {
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/testdb',
        INGEST_WORKFLOW: mockWorkflow,
      },
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should reject unauthenticated POST /guides with 401/400', async () => {
    const req = new Request('http://localhost/guides', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Tokyo Trip',
      }),
    });

    const res = await testApp.request(
      req,
      {},
      {
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/testdb',
        INGEST_WORKFLOW: mockWorkflow,
      },
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('should reject unauthenticated GET /guides/:id with 401/400', async () => {
    const req = new Request('http://localhost/guides/test-guide-id', {
      method: 'GET',
    });

    const res = await testApp.request(
      req,
      {},
      {
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/testdb',
        INGEST_WORKFLOW: mockWorkflow,
      },
    );

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
