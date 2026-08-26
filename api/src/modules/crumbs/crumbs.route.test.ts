import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import type { AppEnv } from '../../core/types/env';
import { crumbsRouter } from './crumbs.route';

const testApp = new Hono<AppEnv>();
testApp.route('/crumbs', crumbsRouter);

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

describe('Crumbs Route HTTP & Auth Validation', () => {
  it('should reject unauthenticated GET /crumbs/counts with 401/400', async () => {
    const req = new Request('http://localhost/crumbs/counts', {
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

  it('should reject unauthenticated GET /crumbs with 401/400', async () => {
    const req = new Request('http://localhost/crumbs', {
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

  it('should reject unauthenticated GET /crumbs/:id with 401/400', async () => {
    const req = new Request('http://localhost/crumbs/test-crumb-id', {
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

  it('should reject unauthenticated PATCH /crumbs/:id with 401/400', async () => {
    const req = new Request('http://localhost/crumbs/test-crumb-id', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'saved',
        userNotes: 'Great pasta!',
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

  it('should reject unauthenticated DELETE /crumbs/:id with 401/400', async () => {
    const req = new Request('http://localhost/crumbs/test-crumb-id', {
      method: 'DELETE',
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
