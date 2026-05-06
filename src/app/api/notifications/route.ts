import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { getAppSettings } from "@/lib/settings";

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
    const unreadMessagesData = db.prepare(`
      SELECT COUNT(m.id) as count
      FROM messages m
      JOIN trips t ON m.trip_id = t.id
      JOIN trip_participants tp ON t.id = tp.trip_id AND tp.user_id = ?
      LEFT JOIN user_chat_reads ucr ON ucr.user_id = ? AND ucr.trip_id = m.trip_id
      WHERE m.sender_id != ? 
      AND (ucr.last_read_at IS NULL OR m.created_at > ucr.last_read_at)
    `).get(userId, userId, userId) as { count: number };

    // 2. Pending Requests: trip_requests for trips organized by the user
    // where status = 'pending' and notification_seen = 0
    const pendingRequestsData = db.prepare(`
      SELECT COUNT(tr.id) as count
      FROM trip_requests tr
      JOIN trips t ON tr.trip_id = t.id
      WHERE t.organizer_id = ? AND tr.status = 'pending' AND tr.notification_seen = 0
    `).get(userId) as { count: number };

    // 3. New Acceptances: trip_requests created by the user
    // where status = 'accepted' and notification_seen = 0
    const newAcceptancesData = db.prepare(`
      SELECT COUNT(tr.id) as count
      FROM trip_requests tr
      WHERE tr.requester_id = ? AND tr.status = 'accepted' AND tr.notification_seen = 0
    `).get(userId) as { count: number };

    let adminPendingApps = 0;
    let adminPendingFeedbacks = 0;
    let adminNewBookings = 0;
    let adminNewSupport = 0;
    let newTrips = 0;
    let newBookings = 0;

    const isAdmin = user.email === 'gotogether.live@gmail.com' || user.role === 'super_admin';

    if (isAdmin) {
      const settings = getAppSettings();
      adminPendingApps = (db.prepare(`SELECT COUNT(id) as count FROM business_applications WHERE status = 'pending' AND notification_seen = 0`).get() as { count: number })?.count || 0;
      // Only count feedback notifications if feedback_alerts is enabled
      if (settings.feedback_alerts) {
        adminPendingFeedbacks = (db.prepare(`SELECT COUNT(id) as count FROM feedbacks WHERE status = 'pending' AND notification_seen = 0`).get() as { count: number })?.count || 0;
      }
      adminNewBookings = (db.prepare(`SELECT COUNT(tb.id) as count FROM trip_bookings tb WHERE tb.notification_seen = 0`).get() as { count: number })?.count || 0;
      try {
        adminNewSupport = (db.prepare(`SELECT COUNT(id) as count FROM support_tickets WHERE notification_seen = 0`).get() as { count: number })?.count || 0;
      } catch { /* table might not exist yet */ }
    } else {
      newTrips = (db.prepare(`SELECT COUNT(id) as count FROM trips WHERE organizer_id = ? AND status = 'live' AND notification_seen = 0`).get(userId) as { count: number })?.count || 0;
    }

    // Organizers get booking notifications for their trips
    newBookings = (db.prepare(`
      SELECT COUNT(tb.id) as count 
      FROM trip_bookings tb 
      JOIN trips t ON tb.trip_id = t.id 
      WHERE t.organizer_id = ? AND tb.notification_seen = 0
    `).get(userId) as { count: number })?.count || 0;

    return NextResponse.json({
      unreadMessages: unreadMessagesData?.count || 0,
      pendingRequests: pendingRequestsData?.count || 0,
      newAcceptances: newAcceptancesData?.count || 0,
      adminPendingApps,
      adminPendingFeedbacks,
      adminNewBookings,
      adminNewSupport,
      newTrips,
      newBookings,
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

    if (type === 'acceptances') {
      db.prepare(`
        UPDATE trip_requests
        SET notification_seen = 1
        WHERE requester_id = ? AND status = 'accepted' AND notification_seen = 0
      `).run(user.id);
      return NextResponse.json({ success: true });
    }

    if (type === 'pendingRequests') {
      db.prepare(`
        UPDATE trip_requests
        SET notification_seen = 1
        WHERE trip_id IN (SELECT id FROM trips WHERE organizer_id = ?) AND status = 'pending' AND notification_seen = 0
      `).run(user.id);
      return NextResponse.json({ success: true });
    }

    if (type === 'newTrips') {
      db.prepare(`UPDATE trips SET notification_seen = 1 WHERE organizer_id = ? AND status = 'live' AND notification_seen = 0`).run(user.id);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminPendingApps') {
      db.prepare(`UPDATE business_applications SET notification_seen = 1 WHERE status = 'pending' AND notification_seen = 0`).run();
      return NextResponse.json({ success: true });
    }


    if (type === 'adminPendingFeedbacks') {
      db.prepare(`UPDATE feedbacks SET notification_seen = 1 WHERE status = 'pending' AND notification_seen = 0`).run();
      return NextResponse.json({ success: true });
    }

    if (type === 'newBookings') {
      db.prepare(`
        UPDATE trip_bookings SET notification_seen = 1 
        WHERE notification_seen = 0 AND trip_id IN (SELECT id FROM trips WHERE organizer_id = ?)
      `).run(user.id);
      return NextResponse.json({ success: true });
    }

    if (type === 'adminNewBookings') {
      db.prepare(`UPDATE trip_bookings SET notification_seen = 1 WHERE notification_seen = 0`).run();
      return NextResponse.json({ success: true });
    }

    if (type === 'adminNewSupport') {
      try {
        db.prepare(`UPDATE support_tickets SET notification_seen = 1 WHERE notification_seen = 0`).run();
      } catch { /* table might not exist yet */ }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("Notifications update error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
