import { describe, it, before, after } from 'node:test';
import * as assert from 'node:assert';

const originalFetch = globalThis.fetch;

describe('/api/transcribe route', () => {
  let routeModule: typeof import('./route');

  before(async () => {
    process.env.OPENAI_API_KEY='test-key';
    routeModule = await import('./route');
  });

  after(() => {
    delete process.env.OPENAI_API_KEY;
    globalThis.fetch = originalFetch;
  });

  it('returns 400 when no file is provided', async () => {
    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: new FormData(),
    });
    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 400);
    const json = await response.json();
    assert.ok(json.error.includes('No file provided'));
  });

  it('returns 413 when file exceeds size limit', async () => {
    const fd = new FormData();
    const hugeBlob = new Blob([Buffer.alloc(26 * 1024 * 1024)]);
    fd.append('file', hugeBlob, 'big.webm');
    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: fd,
    });
    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 413);
    const json = await response.json();
    assert.ok(json.error.includes('too large'));
  });

  it('calls Whisper API and returns transcript shape on success', async () => {
    globalThis.fetch = async (url, init) => {
      assert.strictEqual(url, 'https://api.openai.com/v1/audio/transcriptions');
      const headers = init?.headers as Record<string, string>;
      assert.ok(headers?.Authorization?.includes('test-key'));
      return new Response(
        JSON.stringify({
          text: 'Hello world',
          language: 'en',
          duration: 2.5,
          segments: [
            {
              id: 0,
              start: 0,
              end: 2.5,
              text: 'Hello world',
              avg_logprob: -0.12,
              no_speech_prob: 0.01,
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const fd = new FormData();
    const blob = new Blob([Buffer.from('fake-webm-data')], { type: 'video/webm' });
    fd.append('file', blob, 'test.webm');

    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: fd,
    });

    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 200);
    const json = await response.json();
    assert.strictEqual(json.transcript, 'Hello world');
    assert.strictEqual(json.language, 'en');
    assert.strictEqual(json.duration, 2.5);
    assert.ok(typeof json.confidence === 'number');
    assert.ok(Array.isArray(json.segments));
  });

  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const fd = new FormData();
    const blob = new Blob([Buffer.from('fake-webm-data')], { type: 'video/webm' });
    fd.append('file', blob, 'test.webm');

    const request = new Request('http://localhost/api/transcribe', {
      method: 'POST',
      body: fd,
    });

    const response = await routeModule.POST(request as any);
    assert.strictEqual(response.status, 500);
    const json = await response.json();
    assert.ok(json.error.includes('OPENAI_API_KEY'));

    process.env.OPENAI_API_KEY='test-key';
  });
});
