type NotificationEvent = 'message' | 'chat-message';
type Listener = (event: MessageEvent) => void;
const listeners = new Map<NotificationEvent, Set<Listener>>();
let source: EventSource | null = null;

// Desktop/mobile bells and chat popups share one connection per browser tab.
// Separate streams can exhaust HTTP/1.1 connections and block normal API calls.
export function subscribeNotificationEvent(type: NotificationEvent, listener: Listener): () => void {
  if (typeof EventSource === 'undefined') return () => {};
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type)!.add(listener);
  if (!source) {
    source = new EventSource('/api/notifications/sse');
    for (const kind of ['message', 'chat-message'] as const) {
      source.addEventListener(kind, event => {
        listeners.get(kind)?.forEach(callback => callback(event as MessageEvent));
      });
    }
  }
  return () => {
    listeners.get(type)?.delete(listener);
    if ([...listeners.values()].every(group => group.size === 0)) {
      source?.close();
      source = null;
      listeners.clear();
    }
  };
}
