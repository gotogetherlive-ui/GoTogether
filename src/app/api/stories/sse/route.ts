import { getSession } from '@/lib/auth';
import { ensureNotificationListener, notificationEvents } from '@/lib/notificationEvents';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  await ensureNotificationListener();

  const encoder = new TextEncoder();
  let closed = false;
  let cleanup: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      send({ type: 'ready' });

      const onStoriesChanged = (payload: object) => {
        send({ type: 'stories_changed', ...payload });
      };

      notificationEvents.on('stories:changed', onStoriesChanged);

      const pingInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          cleanup();
        }
      }, 30000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingInterval);
        notificationEvents.off('stories:changed', onStoriesChanged);
        try { controller.close(); } catch {}
      };
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}