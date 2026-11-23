type NotificationStreamEvent = {
  type: 'refresh';
  timestamp: string;
};

type NotificationListener = (event: NotificationStreamEvent) => void;

const notificationListeners = new Map<string, Set<NotificationListener>>();

export function subscribeToNotificationStream(
  userId: string,
  listener: NotificationListener,
) {
  const listeners = notificationListeners.get(userId) ?? new Set<NotificationListener>();
  listeners.add(listener);
  notificationListeners.set(userId, listeners);

  return () => {
    const currentListeners = notificationListeners.get(userId);
    if (!currentListeners) {
      return;
    }

    currentListeners.delete(listener);
    if (currentListeners.size === 0) {
      notificationListeners.delete(userId);
    }
  };
}

export function publishNotificationRefresh(userId: string) {
  const listeners = notificationListeners.get(userId);
  if (!listeners || listeners.size === 0) {
    return;
  }

  const event: NotificationStreamEvent = {
    type: 'refresh',
    timestamp: new Date().toISOString(),
  };

  for (const listener of listeners) {
    listener(event);
  }
}

// End before the route's 300-second function limit. EventSource reconnects
// automatically after EOF, retaining the existing polling fallback in the UI.
const STREAM_LIFETIME_MS = 240_000;
const KEEP_ALIVE_MS = 25_000;

export function createNotificationEventStream(userId: string, signal: AbortSignal) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (signal.aborted) {
        controller.close();
        return;
      }

      let closed = false;
      const send = (message: string) => {
        if (!closed) controller.enqueue(encoder.encode(message));
      };
      const sendEvent = (event: string, payload: unknown) => {
        send(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
      };

      const unsubscribe = subscribeToNotificationStream(userId, (payload) => {
        sendEvent('notification', payload);
      });
      const keepAlive = setInterval(() => send(': keepalive\n\n'), KEEP_ALIVE_MS);
      const lifetime = setTimeout(closeStream, STREAM_LIFETIME_MS);

      cleanup = () => {
        closed = true;
        clearInterval(keepAlive);
        clearTimeout(lifetime);
        unsubscribe();
        signal.removeEventListener('abort', closeStream);
      };

      function closeStream() {
        if (closed) return;
        cleanup();
        controller.close();
      }

      signal.addEventListener('abort', closeStream, { once: true });
      sendEvent('connected', { ok: true });
      publishNotificationRefresh(userId);
    },
    cancel() {
      // Cancellation already closes the controller; only release resources.
      cleanup();
    },
  });
}
