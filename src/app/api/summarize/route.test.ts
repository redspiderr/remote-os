import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';

const originalFetch = globalThis.fetch;

describe('/api/summarize route', () => {
  let routeModule: typeof import('./route');

  before(async () => {
    process.env.OPENAI_API_KEY='test-openai-key';
    // Stub pg pool to avoid real DB connections in unit tests
    const dbModule = await import('@/lib/db');
    (dbModule as any).db.pool = {
      connect: async () => ({
        query: async () => ({ rowCount: 1 }),
        release: () => {},
      }),
    };
    routeModule = await import('./route');
  });

  after(() => {
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = originalFetch;
  });

  it('returns 400 when transcript is missing', async () => {
    const request = new Request('http://localhost/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 400);
    const json = await response.json();
    assert.ok(json.error.includes('transcript'));
  });

  it('calls OpenAI and returns structured summary on success', async () => {
    globalThis.fetch = async (url, init) => {
      assert.strictEqual(url, 'https://api.openai.com/v1/chat/completions');
      const headers = init?.headers as Record<string, string>;
      assert.ok(headers?.Authorization?.includes('test-openai-key'));
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: 'Shipped the new auth flow and refactored dashboard components.',
                  blockers: ['Waiting on design review.'],
                  action_items: ['Address PR feedback', 'Deploy to staging'],
                  sentiment: 'positive',
                  key_achievements: ['Auth flow shipped', 'Dashboard refactor complete'],
                }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const request = new Request('http://localhost/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcript: 'Yesterday I shipped the new auth flow and refactored the dashboard components. Today I will address PR feedback and deploy to staging. I am waiting on design review.',
        standup_id: 'f6a7b8c9-d0e1-2345-fabc-456789012345',
      }),
    });

    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 200);
    const json = await response.json();
    assert.strictEqual(json.summary, 'Shipped the new auth flow and refactored dashboard components.');
    assert.deepStrictEqual(json.blockers, ['Waiting on design review.']);
    assert.deepStrictEqual(json.action_items, ['Address PR feedback', 'Deploy to staging']);
    assert.strictEqual(json.sentiment, 'positive');
    assert.deepStrictEqual(json.key_achievements, ['Auth flow shipped', 'Dashboard refactor complete']);
  });

  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const request = new Request('http://localhost/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Hello world' }),
    });

    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 500);
    const json = await response.json();
    assert.ok(json.message.includes('OPENAI_API_KEY'));

    process.env.OPENAI_API_KEY='test-openai-key';
  });

  it('returns 500 on malformed OpenAI JSON response', async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ summary: 'Missing other fields' }),
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const request = new Request('http://localhost/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: 'Some text' }),
    });

    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 500);
    const json = await response.json();
    assert.ok(json.message.includes('blockers'));
  });
});
