import { Resend } from 'resend';
import {
  renderAdminCampaignEmail,
  type AdminCampaignType,
} from './adminCampaignEmail';

export type { AdminCampaignType } from './adminCampaignEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL || 'GoTogether <onboarding@resend.dev>';

function e(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseTemplate(title: string, body: string) {
  return `
    <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);padding:32px;text-align:center;">
        <h1 style="color:#fff;font-size:22px;margin:0;font-weight:700;">GoTogether</h1>
        <p style="color:rgba(255,255,255,0.85);font-size:13px;margin:6px 0 0;">${e(title)}</p>
      </div>
      <div style="padding:28px 32px;">${body}</div>
      <div style="background:#f8fafc;padding:14px 32px;text-align:center;">
        <p style="color:#cbd5e1;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} GoTogether &mdash; Travel Better, Together</p>
      </div>
    </div>
  `;
}

export async function sendBookingStatusEmail({
  to,
  userName,
  tripTitle,
  status,
  reason,
}: {
  to: string;
  userName: string;
  tripTitle: string;
  status: 'approved' | 'rejected';
  reason?: string;
}) {
  const isApproved = status === 'approved';
  const subject = isApproved
    ? `Your booking for "${tripTitle}" is confirmed!`
    : `Update on your booking for "${tripTitle}"`;

  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${e(userName)}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${isApproved
        ? `Great news! Your booking request for <strong>${e(tripTitle)}</strong> has been <strong style="color:#16a34a;">approved</strong>. Get ready for an amazing journey!`
        : `We're sorry to inform you that your booking request for <strong>${e(tripTitle)}</strong> has been <strong style="color:#dc2626;">declined</strong>.`
      }
    </p>
    ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;"><p style="color:#7f1d1d;font-size:13px;margin:0;"><strong>Reason:</strong> ${e(reason)}</p></div>` : ''}
    ${isApproved
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;"><p style="color:#14532d;font-size:13px;margin:0;">Head to your <strong>dashboard</strong> to view your booking details and download your confirmation.</p></div>`
      : `<p style="color:#64748b;font-size:13px;">You can browse other available trips and try booking again.</p>`
    }
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (booking status):', err);
  }
}

export async function sendBuddyRequestStatusEmail({
  to,
  userName,
  organizerName,
  tripTitle,
  status,
}: {
  to: string;
  userName: string;
  organizerName: string;
  tripTitle: string;
  status: 'accepted' | 'rejected';
}) {
  const isAccepted = status === 'accepted';
  const subject = isAccepted
    ? `You've been accepted for "${tripTitle}"!`
    : `Update on your buddy request for "${tripTitle}"`;

  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      ${isAccepted
        ? `<strong>${organizerName}</strong> has <strong style="color:#16a34a;">accepted</strong> your request to join <strong>${tripTitle}</strong>. You now have access to the trip group chat!`
        : `<strong>${organizerName}</strong> has decided not to proceed with your request for <strong>${tripTitle}</strong>. Don't give up — there are more trips to explore!`
      }
    </p>
    ${isAccepted
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;"><p style="color:#14532d;font-size:13px;margin:0;">Open your <strong>dashboard</strong> to start chatting with your travel companion.</p></div>`
      : ''
    }
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (buddy request status):', err);
  }
}

export async function sendNewBookingNotificationEmail({
  to,
  organizerName,
  tripTitle,
  bookerName,
  passengerCount,
}: {
  to: string;
  organizerName: string;
  tripTitle: string;
  bookerName: string;
  passengerCount: number;
}) {
  const subject = `New booking received for "${tripTitle}"`;
  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${organizerName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      <strong>${bookerName}</strong> has submitted a booking request for <strong>${tripTitle}</strong> for <strong>${passengerCount}</strong> passenger${passengerCount !== 1 ? 's' : ''}.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;">
      <p style="color:#7c2d12;font-size:13px;margin:0;">Visit your <strong>Business Dashboard</strong> to review and approve or decline this booking.</p>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (new booking notification):', err);
  }
}

export async function sendNewBuddyRequestEmail({
  to,
  organizerName,
  requesterName,
  tripTitle,
}: {
  to: string;
  organizerName: string;
  requesterName: string;
  tripTitle: string;
}) {
  const subject = `${requesterName} wants to join your trip!`;
  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${organizerName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      <strong>${requesterName}</strong> has shown interest in joining your trip to <strong>${tripTitle}</strong>.
    </p>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;">
      <p style="color:#7c2d12;font-size:13px;margin:0;">Go to your <strong>Organizer Dashboard</strong> to review their profile and accept or decline their request.</p>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (new buddy request):', err);
  }
}

export async function sendBuddyTripEditedEmail({
  to,
  userName,
  organizerName,
  tripTitle,
  newDetails,
}: {
  to: string;
  userName: string;
  organizerName: string;
  tripTitle: string;
  newDetails: { starting_location: string; destination: string; start_date: string };
}) {
  const subject = `Update on your buddy trip to "${newDetails.destination}"`;
  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      <strong>${organizerName}</strong> has updated the trip plan details for your upcoming journey <strong>${tripTitle}</strong>.
    </p>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px;margin-bottom:20px;">
      <h3 style="color:#0f172a;font-size:14px;margin:0 0 12px;font-weight:700;">New Trip Plan Details</h3>
      <table style="width:100%;font-size:13px;color:#475569;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;font-weight:600;width:120px;">Destination:</td>
          <td style="padding:6px 0;color:#0f172a;"><strong>${newDetails.destination}</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;">Starting From:</td>
          <td style="padding:6px 0;">${newDetails.starting_location}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-weight:600;">Start Date:</td>
          <td style="padding:6px 0;">${newDetails.start_date}</td>
        </tr>
      </table>
    </div>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 18px;">
      <p style="color:#14532d;font-size:13px;margin:0;">Open your chat to coordinate the updated plans with the organizer.</p>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (buddy trip edited):', err);
  }
}

export async function sendBuddyTripCancelledEmail({
  to,
  userName,
  organizerName,
  tripTitle,
}: {
  to: string;
  userName: string;
  organizerName: string;
  tripTitle: string;
}) {
  const subject = `Cancelled: Buddy trip "${tripTitle}"`;
  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We wanted to let you know that <strong>${organizerName}</strong> has cancelled the buddy trip plan <strong>${tripTitle}</strong>.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="color:#7f1d1d;font-size:13px;margin:0;">This trip will no longer take place, and the chat group has been closed.</p>
    </div>
    <p style="color:#64748b;font-size:13px;">You can browse other active trip plans on GoTogether to find a new travel companion.</p>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (buddy trip cancelled):', err);
  }
}

export async function sendBusinessTripCancelledEmail({
  to,
  userName,
  organizerName,
  tripTitle,
}: {
  to: string;
  userName: string;
  organizerName: string;
  tripTitle: string;
}) {
  const subject = `Cancelled: Premium trip "${tripTitle}"`;
  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      We wanted to let you know that the organizer <strong>${organizerName}</strong> has cancelled the premium trip <strong>${tripTitle}</strong>.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin-bottom:20px;">
      <p style="color:#7f1d1d;font-size:13px;margin:0;">This trip will no longer take place, and your booking has been cancelled.</p>
    </div>
    <p style="color:#64748b;font-size:13px;">If you have paid any booking deposit or amount, the business organizer will contact you regarding the refund details. You can also browse other active premium trips on GoTogether.</p>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (business trip cancelled):', err);
  }
}

export async function sendBookingConfirmedToOrganizer({
  to,
  organizerName,
  tripTitle,
  tripDate,
  pickupLocation,
  destination,
  bookingId,
  travelerName,
  travelerAge,
  travelerGender,
  travelerFoodPref,
  travelerProfession,
  travelerPhone,
  travelerEmail,
  travelerCount,
  passengerNames,
  amountPaid,
  razorpayPaymentId,
}: {
  to: string;
  organizerName: string;
  tripTitle: string;
  tripDate: string;
  pickupLocation: string;
  destination: string;
  bookingId: string;
  travelerName: string;
  travelerAge: number | null;
  travelerGender: string | null;
  travelerFoodPref: string | null;
  travelerProfession: string | null;
  travelerPhone: string;
  travelerEmail: string;
  travelerCount: number;
  passengerNames: string[];
  amountPaid: number;
  razorpayPaymentId: string;
}) {
  const subject = `✅ New confirmed booking for "${tripTitle}" — ₹${amountPaid.toLocaleString('en-IN')}`;

  const formattedDate = (() => {
    try {
      const d = new Date(tripDate + 'T00:00:00Z');
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch { return tripDate; }
  })();

  const namesHtml = passengerNames.length > 0
    ? passengerNames.map((n, i) => `<span style="display:inline-block;background:#f1f5f9;color:#334155;padding:3px 10px;border-radius:6px;font-size:12px;margin:2px 4px 2px 0;">${i + 1}. ${e(n)}</span>`).join('')
    : '<span style="color:#94a3b8;font-size:12px;">—</span>';

  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${organizerName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      A new booking has been <strong style="color:#16a34a;">confirmed with payment</strong> for your trip <strong>${tripTitle}</strong>.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#14532d;font-size:14px;margin:0 0 10px;font-weight:700;">📋 Booking Information</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:140px;">Booking ID:</td><td style="font-family:monospace;color:#0f172a;">${bookingId}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Trip:</td><td>${tripTitle}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Travel Date:</td><td>${formattedDate}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Pickup:</td><td>${pickupLocation || '—'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Destination:</td><td>${destination}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Travelers:</td><td>${travelerCount} person${travelerCount > 1 ? 's' : ''}</td></tr>
      </table>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#0f172a;font-size:14px;margin:0 0 10px;font-weight:700;">👤 Traveler Information</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:140px;">Full Name:</td><td>${travelerName}</td></tr>
        ${travelerAge ? `<tr><td style="padding:4px 0;font-weight:600;">Age:</td><td>${travelerAge}</td></tr>` : ''}
        ${travelerGender ? `<tr><td style="padding:4px 0;font-weight:600;">Gender:</td><td>${travelerGender}</td></tr>` : ''}
        ${travelerFoodPref ? `<tr><td style="padding:4px 0;font-weight:600;">Food Preference:</td><td>${travelerFoodPref}</td></tr>` : ''}
        ${travelerProfession ? `<tr><td style="padding:4px 0;font-weight:600;">Profession:</td><td>${travelerProfession}</td></tr>` : ''}
        <tr><td style="padding:4px 0;font-weight:600;">Phone:</td><td>${travelerPhone}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Email:</td><td>${travelerEmail}</td></tr>
      </table>
      <div style="margin-top:8px;">
        <span style="font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Passengers:</span><br/>
        ${namesHtml}
      </div>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#92400e;font-size:14px;margin:0 0 10px;font-weight:700;">💳 Payment Information</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:140px;">Amount Paid:</td><td style="font-weight:700;color:#16a34a;">₹${amountPaid.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Payment Date:</td><td>${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Razorpay ID:</td><td style="font-family:monospace;font-size:12px;">${razorpayPaymentId}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Status:</td><td style="color:#16a34a;font-weight:700;">✅ Paid</td></tr>
      </table>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (booking confirmed to organizer):', err);
  }
}

export async function sendBookingConfirmedToTraveler({
  to,
  userName,
  tripTitle,
  tripDate,
  pickupLocation,
  destination,
  bookingId,
  ticketNumber,
  organizerName,
  organizerPhone,
  amountPaid,
  razorpayPaymentId,
}: {
  to: string;
  userName: string;
  tripTitle: string;
  tripDate: string;
  pickupLocation: string;
  destination: string;
  bookingId: string;
  ticketNumber: string;
  organizerName: string;
  organizerPhone: string | null;
  amountPaid: number;
  razorpayPaymentId: string;
}) {
  const subject = `🎉 Booking Confirmed — ${tripTitle} | Ticket: ${ticketNumber}`;

  const formattedDate = (() => {
    try {
      const d = new Date(tripDate + 'T00:00:00Z');
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    } catch { return tripDate; }
  })();

  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 6px;">
      <strong style="color:#16a34a;">Congratulations!</strong> Your booking has been confirmed and your payment has been received successfully.
    </p>

    <div style="background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px solid #86efac;border-radius:14px;padding:20px 24px;margin:16px 0;text-align:center;">
      <p style="color:#16a34a;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Your Ticket Number</p>
      <p style="color:#0f172a;font-size:26px;font-weight:800;letter-spacing:2px;margin:0;font-family:monospace;">${ticketNumber}</p>
      <p style="color:#64748b;font-size:11px;margin:6px 0 0;">Booking Ref: ${bookingId}</p>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#0f172a;font-size:14px;margin:0 0 10px;font-weight:700;">🗓 Trip Details</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:120px;">Trip:</td><td>${tripTitle}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Travel Date:</td><td>${formattedDate}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Pickup:</td><td>${pickupLocation || '—'}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Destination:</td><td>${destination}</td></tr>
      </table>
    </div>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#0f172a;font-size:14px;margin:0 0 10px;font-weight:700;">🏢 Organizer</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:120px;">Name:</td><td>${organizerName}</td></tr>
        ${organizerPhone ? `<tr><td style="padding:4px 0;font-weight:600;">Contact:</td><td>${organizerPhone}</td></tr>` : ''}
      </table>
    </div>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#92400e;font-size:14px;margin:0 0 10px;font-weight:700;">💳 Payment Receipt</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:120px;">Amount:</td><td style="font-weight:700;color:#16a34a;">₹${amountPaid.toLocaleString('en-IN')}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Transaction ID:</td><td style="font-family:monospace;font-size:12px;">${razorpayPaymentId}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Status:</td><td style="color:#16a34a;font-weight:700;">✅ Paid</td></tr>
      </table>
    </div>

    <div style="text-align:center;margin:20px 0;">
      <p style="color:#64748b;font-size:13px;margin:0 0 12px;">Download your ticket and view full booking details from your dashboard.</p>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (booking confirmed to traveler):', err);
  }
}

export async function sendBookingCancelledToOrganizer({
  to,
  organizerName,
  tripTitle,
  tripDate,
  bookingRef,
  travelerName,
  travelerCount,
  amountRefunded,
  cancelReason,
}: {
  to: string;
  organizerName: string;
  tripTitle: string;
  tripDate: string;
  bookingRef: string;
  travelerName: string;
  travelerCount: number;
  amountRefunded: number;
  cancelReason: string;
}) {
  const subject = `⚠️ Cancelled Booking Notification: "${tripTitle}"`;

  const body = `
    <p style="color:#334155;font-size:15px;margin:0 0 8px;">Hi <strong>${organizerName}</strong>,</p>
    <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;">
      This email is to notify you that the booking request GT Booking Ref <strong>${bookingRef}</strong> for <strong>${tripTitle}</strong> has been cancelled by the traveler.
    </p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:16px;">
      <h3 style="color:#7f1d1d;font-size:14px;margin:0 0 10px;font-weight:700;">📋 Cancellation Details</h3>
      <table style="width:100%;font-size:13px;color:#334155;border-collapse:collapse;">
        <tr><td style="padding:4px 0;font-weight:600;width:140px;">Booking Ref:</td><td style="font-family:monospace;color:#0f172a;">${bookingRef}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Trip:</td><td>${tripTitle}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Travel Date:</td><td>${tripDate}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Traveler Name:</td><td>${travelerName}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Total Travelers:</td><td>${travelerCount} person${travelerCount > 1 ? 's' : ''}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Reason:</td><td style="color:#991b1b;font-weight:600;">${cancelReason}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600;">Refund Status:</td><td style="color:#16a34a;font-weight:700;">₹${amountRefunded.toLocaleString('en-IN')} Refunded</td></tr>
      </table>
    </div>
  `;

  try {
    await resend.emails.send({ from: FROM, to: [to], subject, html: baseTemplate(subject, body) });
  } catch (err) {
    console.error('Email send error (booking cancelled to organizer):', err);
  }
}

export async function sendAdminCampaignBatch({
  campaignId,
  campaignType,
  recipients,
  subject,
  message,
  ctaLabel,
  ctaUrl,
  logoUrl,
}: {
  campaignId: string;
  campaignType: AdminCampaignType;
  recipients: Array<{ email: string; full_name: string }>;
  subject: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  logoUrl?: string;
}): Promise<number> {
  let sent = 0;

  for (let index = 0; index < recipients.length; index += 100) {
    const chunk = recipients.slice(index, index + 100);
    const payload = chunk.map((recipient) => {
      const greetingName = recipient.full_name?.trim() || 'Traveler';
      return {
        from: FROM,
        to: [recipient.email],
        subject,
        html: renderAdminCampaignEmail({
          campaignType,
          recipientName: greetingName,
          subject,
          message,
          ctaLabel,
          ctaUrl,
          logoUrl,
        }),
        tags: [{ name: 'campaign_type', value: campaignType }],
      };
    });

    const { error } = await resend.batch.send(payload, {
      idempotencyKey: `${campaignId}-${Math.floor(index / 100)}`,
    });
    if (error) throw new Error(error.message || 'Campaign delivery failed');
    sent += chunk.length;
  }

  return sent;
}
