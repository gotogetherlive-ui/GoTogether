import { getSession } from '@/lib/auth';
import { queryOne } from '@/lib/db';
import { ensureNotificationListener, notificationEvents } from '@/lib/notificationEvents';

export const dynamic = 'force-dynamic';

async function getNotificationCounts(userId: string, isAdmin: boolean, isBusiness: boolean) {
  const unreadMsgRow = await queryOne<{ count: number; first_trip: string | null }>(`
    SELECT COUNT(m.id) as count,
           MAX(CASE WHEN m.sender_id != $1 AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at) THEN m.trip_id ELSE NULL END) as first_trip
    FROM messages m
    JOIN trips t ON m.trip_id = t.id
    JOIN trip_participants tp ON t.id = tp.trip_id AND tp.user_id = $2
    LEFT JOIN user_chat_reads ucr ON ucr.user_id = $3 AND ucr.trip_id = m.trip_id
    WHERE m.sender_id != $4 AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at)
  `, [userId, userId, userId, userId]);
  
  const unreadMessages = unreadMsgRow?.count || 0;
  const firstUnreadTripId = unreadMsgRow?.first_trip ?? null;

  const pendingRequestsRow = await queryOne<{ count: number }>(`
    SELECT COUNT(tr.id) as count FROM trip_requests tr
    JOIN trips t ON tr.trip_id = t.id
    WHERE t.organizer_id = $1 AND tr.status = 'pending' AND tr.notification_seen = 0
  `, [userId]);
  const pendingRequests = pendingRequestsRow?.count || 0;

  const newAcceptancesRow = await queryOne<{ count: number }>(`
    SELECT COUNT(tr.id) as count FROM trip_requests tr
    WHERE tr.requester_id = $1 AND tr.status = 'accepted' AND tr.notification_seen = 0
  `, [userId]);
  const newAcceptances = newAcceptancesRow?.count || 0;

  let newBookings = 0;
  if (isBusiness) {
    const newBookingsRow = await queryOne<{ count: number }>(`
      SELECT COUNT(tb.id) as count FROM trip_bookings tb
      JOIN trips t ON tb.trip_id = t.id
      WHERE t.organizer_id = $1 AND tb.notification_seen = 0 AND tb.cancelled_at IS NULL
    `, [userId]);
    newBookings = newBookingsRow?.count || 0;
  }

  let newTrips = 0;
  if (isBusiness) {
    const newTripsRow = await queryOne<{ count: number }>(`
      SELECT COUNT(id) as count FROM trips WHERE organizer_id = $1 AND status = 'live' AND notification_seen = 0
    `, [userId]);
    newTrips = newTripsRow?.count || 0;
  }

  let adminPendingApps = 0, adminPendingFeedbacks = 0, adminNewBookings = 0, adminNewSupport = 0;
  if (isAdmin) {
    const r1 = await queryOne<{ count: number }>(`
      SELECT COUNT(id) as count FROM business_applications WHERE status = 'pending' AND notification_seen = 0
    `, []);
    adminPendingApps = r1?.count || 0;

    const r2 = await queryOne<{ count: number }>(`
      SELECT COUNT(id) as count FROM feedbacks WHERE status = 'pending' AND notification_seen = 0
    `, []);
    adminPendingFeedbacks = r2?.count || 0;

    const r3 = await queryOne<{ count: number }>(`
      SELECT COUNT(tb.id) as count FROM trip_bookings tb WHERE tb.notification_seen = 0 AND tb.cancelled_at IS NULL
    `, []);
    adminNewBookings = r3?.count || 0;

    try {
      const r4 = await queryOne<{ count: number }>(`
        SELECT COUNT(id) as count FROM support_tickets WHERE notification_seen = 0
      `, []);
      adminNewSupport = r4?.count || 0;
    } catch { /* ignore */ }
  }

  const firstAcceptedTripRow = await queryOne<{ trip_id: string }>(`
    SELECT trip_id FROM trip_requests
    WHERE requester_id = $1 AND status = 'accepted' AND notification_seen = 0
    ORDER BY created_at DESC LIMIT 1
  `, [userId]);
  const firstAcceptedTripId = firstAcceptedTripRow?.trip_id ?? null;

  const bookingUpdatesRow = await queryOne<{ count: number }>(`
    SELECT COUNT(id) as count FROM trip_bookings
    WHERE user_id = $1 AND user_notification_seen = 0
  `, [userId]);
  const bookingUpdates = bookingUpdatesRow?.count || 0;

  return {
    unreadMessages: Number(unreadMessages),
    firstUnreadTripId,
    pendingRequests: Number(pendingRequests),
    newAcceptances: Number(newAcceptances),
    firstAcceptedTripId,
    newBookings: Number(newBookings),
    newTrips: Number(newTrips),
    bookingUpdates: Number(bookingUpdates),
    adminPendingApps: Number(adminPendingApps),
    adminPendingFeedbacks: Number(adminPendingFeedbacks),
    adminNewBookings: Number(adminNewBookings),
    adminNewSupport: Number(adminNewSupport),
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

  const isAdmin = !!(await queryOne('SELECT 1 FROM admin_accounts WHERE email = $1', [user.email])|| user.role === 'super_admin');
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
