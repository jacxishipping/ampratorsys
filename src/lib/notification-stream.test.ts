import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import {
  createNotificationEventStream,
  publishNotificationRefresh,
} from './notification-stream';

const decoder = new TextDecoder();

describe('notification event stream', () => {
  beforeEach(() => {
    mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('sends connection, refresh, and keepalive events', async () => {
    const abort = new AbortController();
    const reader = createNotificationEventStream('events-user', abort.signal).getReader();
    assert.match(decoder.decode((await reader.read()).value), /event: connected/);
    assert.match(decoder.decode((await reader.read()).value), /event: notification/);
    mock.timers.tick(25_000);
    assert.equal(decoder.decode((await reader.read()).value), ': keepalive\n\n');
    publishNotificationRefresh('events-user');
    assert.match(decoder.decode((await reader.read()).value), /event: notification/);
    abort.abort();
    assert.equal((await reader.read()).done, true);
  });

  it('closes gracefully after four minutes, before the function timeout', async () => {
    const reader = createNotificationEventStream('expiry-user', new AbortController().signal).getReader();
    mock.timers.tick(240_000);
    const events: string[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      events.push(decoder.decode(value));
    }
    assert.ok(events.some((event) => event.includes('event: connected')));
    assert.doesNotThrow(() => publishNotificationRefresh('expiry-user'));
    mock.timers.tick(300_000);
  });

  it('cleans up on abort without waiting for the lifetime timer', async () => {
    const abort = new AbortController();
    const reader = createNotificationEventStream('abort-user', abort.signal).getReader();
    await reader.read();
    await reader.read();
    abort.abort();
    assert.equal((await reader.read()).done, true);
    assert.doesNotThrow(() => publishNotificationRefresh('abort-user'));
    mock.timers.tick(300_000);
  });

  it('cleans up when the response consumer cancels', async () => {
    const abort = new AbortController();
    const reader = createNotificationEventStream('cancel-user', abort.signal).getReader();
    await reader.cancel();
    assert.doesNotThrow(() => publishNotificationRefresh('cancel-user'));
    assert.doesNotThrow(() => abort.abort());
    mock.timers.tick(300_000);
    assert.equal((await reader.read()).done, true);
  });

  it('does not start timers or subscribe for an already-aborted request', async () => {
    const abort = new AbortController();
    abort.abort();
    const reader = createNotificationEventStream('closed-user', abort.signal).getReader();
    assert.equal((await reader.read()).done, true);
    assert.doesNotThrow(() => publishNotificationRefresh('closed-user'));
    mock.timers.tick(300_000);
  });
});
