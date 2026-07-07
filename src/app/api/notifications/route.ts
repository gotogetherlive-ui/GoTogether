import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { queryOne, run } from "@/lib/db";
import { getAppSettings } from "@/lib/settings";
import { isAdminUser } from "@/lib/admin";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // 1. Unread Messages: count messages in trips the user is part of, 
    // where message created_at > user_chat_reads.last_read_at (or if not read yet)
    // AND sender_id != user.id
    const unreadMessagesData = await queryOne(`
      SELECT COUNT(m.id) as count
      FROM messages m
      JOIN trips t ON m.trip_id = t.id
      JOIN trip_participants tp ON t.id = tp.trip_id AND tp.user_id = $1
      LEFT JOIN user_chat_reads ucr ON ucr.user_id = $2 AND ucr.trip_id = m.trip_id
      WHERE m.sender_id != $3
      AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at)
    `, [userId, userId, userId]) as any;

    // 2. Pending Requests: trip_requests for trips organized by the user
    // where status = 'pending' and notification_seen = 0
    const pendingRequestsData = await queryOne(`
      SELECT COUNT(tr.id) as count
      FROM trip_requests tr
      JOIN trips t ON tr.trip_id = t.id
      WHERE t.organizer_id = $1 AND tr.status = 'pending' AND tr.notification_seen = 0
    `, [userId]) as any;

    // 3. New Acceptances: trip_requests created by the user
    // where status = 'accepted' and notification_seen = 0
    const newAcceptancesData = await queryOne(`
      SELECT COUNT(tr.id) as count
      FROM trip_requests tr
      WHERE tr.requester_id = $1 AND tr.status = 'accepted' AND tr.notification_seen = 0
    `, [userId]) as any;

    let adminPendingApps = 0;
    let adminPendingFeedbacks = 0;
    let adminNewBookings = 0;
    let adminNewSupport = 0;
    let newTrips = 0;
    let newBookings = 0;

    const isAdmin = await isAdminUser(user);

    if (isAdmin) {
      const settings = await getAppSettings();
      const pendingAppsRow = await queryOne(`SELECT COUNT(id) as count FROM business_applications WHERE status = 'pending' AND notification_seen = 0`) as any;
      adminPendingApps = pendingAppsRow?.count || 0;

      // Only count feedback notifications if feedback_alerts is enabled
      if (settings.feedback_alerts) {
        const pendingFeedbacksRow = await queryOne(`SELECT COUNT(id) as count FROM feedbacks WHERE status = 'pending' AND notification_seen = 0`) as any;
        adminPendingFeedbacks = pendingFeedbacksRow?.count || 0;
      }

      const newBookingsRow = await queryOne(`SELECT COUNT(tb.id) as count FROM trip_bookings tb WHERE tb.notification_seen = 0`) as any;
      adminNewBookings = newBookingsRow?.count || 0;

      try {
        const newSupportRow = await queryOne(`SELECT COUNT(id) as count FROM support_tickets WHERE notification_seen = 0`) as any;
        adminNewSupport = newSupportRow?.count || 0;
      } catch { /* table might not exist yet */ }
    } else {
      const newTripsRow = await queryOne(`SELECT COUNT(id) as count FROM trips WHERE organizer_id = $1 AND status = 'live' AND notification_seen = 0`, [userId]) as any;
      newTrips = newTripsRow?.count || 0;
    }

    // Organizers get booking notifications for their trips
    const newBookingsRow = await queryOne(`
      SELECT COUNT(tb.id) as count 
      FROM trip_bookings tb 
      JOIN trips t ON tb.trip_id = t.id 
      WHERE t.organizer_id = $1 AND tb.notification_seen = 0
    `, [userId]) as any;
    newBookings = newBookingsRow?.count || 0;

    return NextResponse.json({
      unreadMessages: Number(unreadMessagesData?.count || 0),
      pendingRequests: Number(pendingRequestsData?.count || 0),
      newAcceptances: Number(newAcceptancesData?.count || 0),
      adminPendingApps: Number(adminPendingApps),
      adminPendingFeedbacks: Number(adminPendingFeedbacks),
      adminNewBookings: Number(adminNewBookings),
      adminNewSupport: Number(adminNewSupport),
      newTrips: Number(newTrips),
      newBookings: Number(newBookings),
      isAdmin,
      isBusiness: user.role === 'business',
    });
  } catch (err) {
    console.error("Notifications fetch error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;
    const adminOnlyTypes = new Set(['adminPendingApps', 'adminPendingFeedbacks', 'adminNewBookings', 'adminNewSupport']);
    if (adminOnlyTypes.has(type) && !(await isAdminUser(user))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (type === 'acceptances') {
      await run(`
        UPDATE trip_requests
        SET notification_seen = 1
        WHERE requester_id = $1 AND status = 'accepted' AND notification_seen = 0
      `, [user.id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'pendingRequests') {
      await run(`
        UPDATE trip_requests
        SET notification_seen = 1
        WHERE trip_id IN (SELECT id FROM trips WHERE organizer_id = $1) AND status = 'pending' AND notification_seen = 0
      `, [user.id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'newTrips') {
      await run(`UPDATE trips SET notification_seen = 1 WHERE organizer_id = $1 AND status = 'live' AND notification_seen = 0`, [user.id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminPendingApps') {
      await run(`UPDATE business_applications SET notification_seen = 1 WHERE status = 'pending' AND notification_seen = 0`);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminPendingFeedbacks') {
      await run(`UPDATE feedbacks SET notification_seen = 1 WHERE status = 'pending' AND notification_seen = 0`);
      return NextResponse.json({ success: true });
    }

    if (type === 'newBookings') {
      await run(`
        UPDATE trip_bookings SET notification_seen = 1 
        WHERE notification_seen = 0 AND trip_id IN (SELECT id FROM trips WHERE organizer_id = $1)
      `, [user.id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'bookingUpdates') {
      await run(`UPDATE trip_bookings SET user_notification_seen = 1 WHERE user_id = $1 AND user_notification_seen = 0`, [user.id]);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminNewBookings') {
      await run(`UPDATE trip_bookings SET notification_seen = 1 WHERE notification_seen = 0`);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminNewSupport') {
      try {
        await run(`UPDATE support_tickets SET notification_seen = 1 WHERE notification_seen = 0`);
      } catch { /* table might not exist yet */ }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Notifications update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
