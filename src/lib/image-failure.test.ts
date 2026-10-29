import { describe, expect, it, vi, afterEach } from 'vitest';
import { imageServiceFailure } from './image-failure';
import { replicateRun } from './images.server';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); vi.unstubAllEnvs(); });
describe('drawing-service recovery', () => {
  it('identifies the observed E004 outage as temporary', () => {
    const e = imageServiceFailure(0, 'ModelError: Service is temporarily unavailable. Please try again later. (E004)');
    expect(e.retryable).toBe(true);
    expect(e.message).toContain('temporarily unavailable');
  });
  it('never retries account, denied, unavailable or invalid requests', () => {
    for (const status of [400, 401, 402, 403, 404, 422]) expect(imageServiceFailure(status).retryable).toBe(false);
    expect(imageServiceFailure(0, 'Content refused by safety filter').retryable).toBe(false);
  });
  it('retries the observed failure once with the same model and references', async () => {
    vi.useFakeTimers();
    vi.stubEnv('LOVABLE_API_KEY', 'test'); vi.stubEnv('REPLICATE_API_KEY', 'test');
    const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: 'one', status: 'failed', error: 'Service is temporarily unavailable (E004)' }))).mockResolvedValueOnce(new Response(JSON.stringify({ id: 'two', status: 'succeeded', output: 'https://example.test/result.png' })));
    vi.stubGlobal('fetch', fetcher);
    const pending = replicateRun({ model: 'google/nano-banana-pro', version: '', settings: { reference_field: 'image_input' } }, 'Keep the scene', ['https://example.test/scene.png']);
    await vi.advanceTimersByTimeAsync(4000);
    expect(await pending).toBe('https://example.test/result.png');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[0]).toEqual(fetcher.mock.calls[1]);
  });
});