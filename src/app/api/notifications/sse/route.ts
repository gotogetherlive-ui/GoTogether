import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ensureNotificationListener, notificationEvents } from '@/lib/notificationEvents';
import { isAdminUser } from '@/lib/admin';

export const dynamic = 'force-dynamic';

async function getNotificationCounts(userId: string, isAdmin: boolean, isBusiness: boolean) {
  const counts = await queryOne<{
    unread_messages: number; first_unread_trip_id: string | null;
    pending_requests: number; new_acceptances: number; first_accepted_trip_id: string | null;
    new_bookings: number; new_trips: number; booking_updates: number;
    admin_pending_apps: number; admin_pending_feedbacks: number;
    admin_new_bookings: number; admin_new_support: number;
  }>(`
    SELECT
      (SELECT COUNT(m.id)::int FROM messages m
        JOIN trips t ON t.id = m.trip_id
        JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $1
        LEFT JOIN user_chat_reads ucr ON ucr.user_id = $1 AND ucr.trip_id = m.trip_id
        WHERE m.sender_id <> $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at)) AS unread_messages,
      (SELECT m.trip_id FROM messages m
        JOIN trips t ON t.id = m.trip_id
        JOIN trip_participants tp ON tp.trip_id = t.id AND tp.user_id = $1
        LEFT JOIN user_chat_reads ucr ON ucr.user_id = $1 AND ucr.trip_id = m.trip_id
        WHERE m.sender_id <> $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at)
        ORDER BY m.created_at DESC LIMIT 1) AS first_unread_trip_id,
      (SELECT COUNT(tr.id)::int FROM trip_requests tr JOIN trips t ON t.id = tr.trip_id
        WHERE t.organizer_id = $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tr.status = 'pending' AND tr.notification_seen = 0) AS pending_requests,
      (SELECT COUNT(tr.id)::int FROM trip_requests tr JOIN trips t ON t.id = tr.trip_id
        WHERE tr.requester_id = $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tr.status = 'accepted' AND tr.notification_seen = 0) AS new_acceptances,
      (SELECT tr.trip_id FROM trip_requests tr JOIN trips t ON t.id = tr.trip_id
        WHERE tr.requester_id = $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tr.status = 'accepted' AND tr.notification_seen = 0
        ORDER BY tr.created_at DESC LIMIT 1) AS first_accepted_trip_id,
      CASE WHEN $2::boolean THEN (SELECT COUNT(tb.id)::int FROM trip_bookings tb
        JOIN trips t ON t.id = tb.trip_id WHERE t.organizer_id = $1
          AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tb.notification_seen = 0 AND tb.cancelled_at IS NULL) ELSE 0 END AS new_bookings,
      CASE WHEN $2::boolean THEN (SELECT COUNT(id)::int FROM trips
        WHERE organizer_id = $1 AND status = 'live' AND notification_seen = 0) ELSE 0 END AS new_trips,
      (SELECT COUNT(tb.id)::int FROM trip_bookings tb JOIN trips t ON t.id = tb.trip_id
        WHERE tb.user_id = $1 AND t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tb.user_notification_seen = 0) AS booking_updates,
      CASE WHEN $3::boolean THEN (SELECT COUNT(id)::int FROM business_applications
        WHERE status = 'pending' AND notification_seen = 0) ELSE 0 END AS admin_pending_apps,
      CASE WHEN $3::boolean THEN (SELECT COUNT(id)::int FROM feedbacks
        WHERE status = 'pending' AND notification_seen = 0) ELSE 0 END AS admin_pending_feedbacks,
      CASE WHEN $3::boolean THEN (SELECT COUNT(tb.id)::int FROM trip_bookings tb
        JOIN trips t ON t.id = tb.trip_id WHERE t.status <> 'deleted' AND t.deleted_at IS NULL
          AND tb.notification_seen = 0 AND tb.cancelled_at IS NULL) ELSE 0 END AS admin_new_bookings,
      CASE WHEN $3::boolean THEN (SELECT COUNT(id)::int FROM support_tickets
        WHERE notification_seen = 0) ELSE 0 END AS admin_new_support
  `, [userId, isBusiness, isAdmin]);

  return {
    unreadMessages: counts?.unread_messages || 0,
    firstUnreadTripId: counts?.first_unread_trip_id ?? null,
    pendingRequests: counts?.pending_requests || 0,
    newAcceptances: counts?.new_acceptances || 0,
    firstAcceptedTripId: counts?.first_accepted_trip_id ?? null,
    newBookings: counts?.new_bookings || 0,
    newTrips: counts?.new_trips || 0,
    bookingUpdates: counts?.booking_updates || 0,
    adminPendingApps: counts?.admin_pending_apps || 0,
    adminPendingFeedbacks: counts?.admin_pending_feedbacks || 0,
    adminNewBookings: counts?.admin_new_bookings || 0,
    adminNewSupport: counts?.admin_new_support || 0,
    isAdmin,
    isBusiness
  };
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  await ensureNotificationListener();

  const isAdmin = await isAdminUser(user);
  const isBusiness = user.role === 'business';

  const encoder = new TextEncoder();
  let closed = false;
  let cleanupListeners: () => void = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Send initial counts immediately
      getNotificationCounts(user.id, isAdmin, isBusiness).then(send).catch(console.error);

      // Listener callback for changes
      const onNotificationChange = () => {
        try {
          getNotificationCounts(user.id, isAdmin, isBusiness).then(send).catch((err) => {
            console.error('[SSE] Failed to fetch notification counts:', err);
            cleanupListeners();
          });
        } catch {
          cleanupListeners();
        }
      };

      // Subscribe to user-specific events
      notificationEvents.on(`notification:${user.id}`, onNotificationChange);

      // Subscribe to admin-specific events if relevant
      if (isAdmin) {
        notificationEvents.on('notification:admin', onNotificationChange);
      }

      // Heartbeat ping every 30 seconds to keep the socket alive
      const pingInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(':keepalive\n\n'));
        } catch {
          cleanupListeners();
        }
      }, 30000);

      cleanupListeners = () => {
        if (closed) return;
        closed = true;
        clearInterval(pingInterval);
        notificationEvents.off(`notification:${user.id}`, onNotificationChange);
        if (isAdmin) {
          notificationEvents.off('notification:admin', onNotificationChange);
        }
        try {
          controller.close();
        } catch { /* already closed */ }
      };
    },
    cancel() {
      cleanupListeners();
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
