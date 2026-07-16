"use client";

import { useState, useEffect } from "react";
import { Loader2, Calendar, MapPin, CheckCircle, XCircle, Clock, Heart, Users, Phone, ArrowRight, ArrowLeft, X, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatISTDate } from "@/lib/dateUtils";
import { parseNames } from "@/lib/utils";

interface Request {
  request_id: string;
  request_status: string;
  requested_at: string;
  trip_id: string;
  trip_slug: string | null;
  title: string;
  destination: string;
  duration_days: number;
  organizer_name: string;
}

interface Booking {
  booking_id: string;
  booking_status: string;
  legacy_status: string;
  payment_status: string;
  amount: number | null;
  expires_at: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  booked_at: string;
  male_count: number;
  female_count: number;
  child_count: number;
  names: string;
  phone_number: string;
  trip_date: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  booking_ref?: string;
  ticket_number?: string;
  qr_code_data?: string;
  trip_id: string;
  trip_slug: string | null;
  title: string;
  destination: string;
  duration_days: number;
  image_url: string | null;
  organizer_name: string;
  refund_status?: string | null;
  refund_amount?: number | null;
  cancellation_fee?: number | null;
  cancellation_date?: string | null;
  trip_cancel_reason_type?: string | null;
  trip_cancel_reason?: string | null;
}

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<'buddy' | 'premium'>('buddy');
  const [premiumView, setPremiumView] = useState<'active' | 'history'>('active');
  const [requests, setRequests] = useState<Request[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const router = useRouter();

  const getCancellationEstimate = (tripDateStr: string, amount: number) => {
    const tripStart = new Date(tripDateStr);
    const now = new Date();
    const hoursRemaining = (tripStart.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining <= 0) return { allowed: false, text: "Trip Started - Cancellation Disabled", pct: 0, amount: 0, fee: amount };
    if (hoursRemaining >= 72) return { allowed: true, text: "72+ Hours Cancel (100% Refund)", pct: 100, amount, fee: 0 };
    if (hoursRemaining >= 24) return { allowed: true, text: "24-72 Hours Cancel (50% Refund)", pct: 50, amount: Math.floor(amount * 0.5), fee: amount - Math.floor(amount * 0.5) };
    return { allowed: true, text: "Under 24 Hours Cancel (No Refund)", pct: 0, amount: 0, fee: amount };
  };


  const getPaymentMsRemaining = (book: Booking) => {
    if (!book.expires_at) return 0;
    const expiresAt = new Date(book.expires_at).getTime();
    if (!Number.isFinite(expiresAt)) return 0;
    return expiresAt - now;
  };

  const isPaymentWindowBooking = (book: Booking) =>
    book.booking_status === 'pending_payment' ||
    book.booking_status === 'payment_processing' ||
    (book.booking_status === 'failed' && book.payment_status === 'failed');

  const isPendingPaymentVisible = (book: Booking) =>
    isPaymentWindowBooking(book) && getPaymentMsRemaining(book) > 0;

  const formatPaymentCountdown = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  };

  const uniqueBookings = (items: Booking[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.booking_id)) return false;
      seen.add(item.booking_id);
      return true;
    });
  };
  const fetchData = async () => {
    try {
      const res = await fetch("/api/user/requests");
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
            if (data.bookings) {
        const normalizedBookings = uniqueBookings(data.bookings);
        setBookings(normalizedBookings);
        if (typeof window !== "undefined") {
          const tab = new URLSearchParams(window.location.search).get('tab');
          const currentTime = Date.now();
          const hasPendingPayment = normalizedBookings.some((book) => {
            if (book.booking_status !== 'pending_payment' && book.booking_status !== 'payment_processing') return false;
            if (!book.expires_at) return false;
            return new Date(book.expires_at).getTime() > currentTime;
          });
          if (!tab && hasPendingPayment) setActiveTab('premium');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'premium' || tab === 'buddy') {
        setActiveTab(tab);
      }
    }
  }, []);

  useEffect(() => {
    const hasActiveCountdown = bookings.some((book) =>
      (book.booking_status === 'pending_payment' || book.booking_status === 'payment_processing') &&
      !!book.expires_at &&
      new Date(book.expires_at).getTime() > Date.now()
    );
    if (!hasActiveCountdown) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [bookings]);

  const downloadConfirmationPDF = async (book: Booking) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210;
    const H = 297;
    const M = 18;
    const cW = W - M * 2;
    const names = parseNames(book.names);
    const totalPeople = book.male_count + book.female_count + book.child_count;
    const tripDate = formatISTDate(book.trip_date, { month: 'long' });
    const bookedDate = formatISTDate(book.booked_at, { month: 'long' });
    const ref = book.booking_ref || book.booking_id.slice(0, 8).toUpperCase();
    const fullRef = book.ticket_number || book.booking_ref || book.booking_id.toUpperCase();
    const now = new Date();

    // ── OUTER PAGE BORDER (certificate feel) ─────────────────────
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.rect(6, 6, W - 12, H - 12);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.rect(8, 8, W - 16, H - 16);

    // ═══════════════════════════════════════════════════════════════
    // HEADER BLOCK — Navy gradient with layered effect
    // ═══════════════════════════════════════════════════════════════
    // Main dark background
    doc.setFillColor(15, 23, 42);
    doc.rect(M, M, cW, 44, 'F');

    // Subtle decorative accent strip at bottom
    doc.setFillColor(245, 158, 11);
    doc.rect(M, M + 44, cW, 1.8, 'F');

    // Left decorative vertical accent
    doc.setFillColor(234, 88, 12);
    doc.rect(M, M, 3, 44, 'F');

    // Brand name
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('GoTogether', M + 8, M + 16);

    // Tagline
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('PREMIUM TRAVEL EXPERIENCES', M + 8, M + 23);

    // Thin separator under brand
    doc.setDrawColor(55, 65, 81);
    doc.setLineWidth(0.2);
    doc.line(M + 8, M + 26, M + 65, M + 26);

    // Contact & website under brand
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text('www.gotogethertrip.com', M + 8, M + 31);
    doc.text('support@gotogethertrip.com', M + 8, M + 35);

    // Right side — Document type
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('BOOKING CONFIRMATION', M + cW - 4, M + 10, { align: 'right' });

    // Reference number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(245, 158, 11);
    doc.text('REFERENCE', M + cW - 4, M + 17, { align: 'right' });
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(ref, M + cW - 4, M + 26, { align: 'right' });

    // Confirmed badge
    doc.setFillColor(22, 163, 74);
    const badgeW = 34;
    const badgeX = M + cW - badgeW - 4;
    doc.roundedRect(badgeX, M + 30, badgeW, 8, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('CONFIRMED', badgeX + badgeW / 2, M + 35.5, { align: 'center' });

    // ═══════════════════════════════════════════════════════════════
    // DIAGONAL WATERMARK STAMP (authenticity)
    // ═══════════════════════════════════════════════════════════════
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.04 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(72);
    doc.setTextColor(22, 163, 74);
    // Rotate text for diagonal watermark
    const cx = W / 2, cy = H / 2;
    doc.text('CONFIRMED', cx, cy, { align: 'center', angle: 35 });
    doc.restoreGraphicsState();

    // ═══════════════════════════════════════════════════════════════
    // TRIP TITLE AREA
    // ═══════════════════════════════════════════════════════════════
    let y = M + 54;

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    const titleLines = doc.splitTextToSize(book.title, cW - 10) as string[];
    doc.text(titleLines, M + 4, y);
    y += titleLines.length * 7.5 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Organized by  ${book.organizer_name}`, M + 4, y);
    y += 10;

    // ═══════════════════════════════════════════════════════════════
    // TRIP DETAILS — 3x2 Info Cards
    // ═══════════════════════════════════════════════════════════════
    // Section label
    doc.setFillColor(245, 158, 11);
    doc.rect(M, y, 1.5, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('TRIP DETAILS', M + 5, y + 4.5);
    y += 10;

    // Card helper
    const infoCard = (label: string, value: string, x: number, yPos: number, w: number, dotColor: [number, number, number]) => {
      // Card background
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(x, yPos, w, 16, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.roundedRect(x, yPos, w, 16, 1.5, 1.5, 'S');

      // Colored dot
      doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      doc.circle(x + 5, yPos + 5.5, 1.2, 'F');

      // Label
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(label.toUpperCase(), x + 9, yPos + 6);

      // Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(value, w - 12) as string[];
      doc.text(lines[0] || '', x + 5, yPos + 12.5);
    };

    const cardW = (cW - 8) / 3;
    const gap = 4;
    const x1 = M, x2 = M + cardW + gap, x3 = M + (cardW + gap) * 2;

    infoCard('Destination', book.destination, x1, y, cardW, [234, 88, 12]);
    infoCard('Travel Date', tripDate, x2, y, cardW, [22, 163, 74]);
    infoCard('Duration', `${book.duration_days} Day${book.duration_days > 1 ? 's' : ''}`, x3, y, cardW, [59, 130, 246]);
    y += 20;
    infoCard('Booking Date', bookedDate, x1, y, cardW, [168, 85, 247]);
    infoCard('Status', 'Confirmed', x2, y, cardW, [22, 163, 74]);
    const formattedAmount = book.amount ? `INR ${(book.amount / 100).toLocaleString('en-IN')}` : 'INR 0';
    infoCard('Amount Paid', formattedAmount, x3, y, cardW, [245, 158, 11]);
    y += 22;

    // ═══════════════════════════════════════════════════════════════
    // PASSENGER MANIFEST
    // ═══════════════════════════════════════════════════════════════
    // Section label
    doc.setFillColor(59, 130, 246);
    doc.rect(M, y, 1.5, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('PASSENGER MANIFEST', M + 5, y + 4.5);

    // Right — count summary
    const countParts: string[] = [];
    if (book.male_count > 0) countParts.push(`${book.male_count} Male`);
    if (book.female_count > 0) countParts.push(`${book.female_count} Female`);
    if (book.child_count > 0) countParts.push(`${book.child_count} Child${book.child_count > 1 ? 'ren' : ''}`);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`${totalPeople} Passenger${totalPeople > 1 ? 's' : ''}  —  ${countParts.join('  ·  ')}`, M + cW - 2, y + 4.5, { align: 'right' });
    y += 11;

    // Table header
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(M, y, cW, 7, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(255, 255, 255);
    doc.text('NO.', M + 5, y + 4.8);
    doc.text('PASSENGER NAME', M + 16, y + 4.8);
    doc.text('CATEGORY', M + cW - 5, y + 4.8, { align: 'right' });
    y += 7;

    // Table body
    const rowH = 7;
    let mi = 0, fi = 0, ci = 0;
    names.forEach((name, i) => {
      const isEven = i % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(M, y, cW, rowH, 'F');

      // Bottom border
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.15);
      doc.line(M, y + rowH, M + cW, y + rowH);

      // Number
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(String(i + 1).padStart(2, '0'), M + 5, y + 4.8);

      // Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(name || '—', M + 16, y + 4.8);

      // Type
      let typeLabel = '';
      if (mi < book.male_count) { typeLabel = 'Adult (M)'; mi++; }
      else if (fi < book.female_count) { typeLabel = 'Adult (F)'; fi++; }
      else if (ci < book.child_count) { typeLabel = 'Child'; ci++; }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(typeLabel, M + cW - 5, y + 4.8, { align: 'right' });

      y += rowH;
    });

    // Table bottom border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(M, y, M + cW, y);
    y += 8;

    // ═══════════════════════════════════════════════════════════════
    // CONTACT
    // ═══════════════════════════════════════════════════════════════
    doc.setFillColor(168, 85, 247);
    doc.rect(M, y, 1.5, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text('CONTACT INFORMATION', M + 5, y + 4.5);
    y += 10;

    doc.setFillColor(249, 250, 251);
    doc.roundedRect(M, y, cW / 2 - 2, 35, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.15);
    doc.roundedRect(M, y, cW / 2 - 2, 35, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('PRIMARY CONTACT NUMBER', M + 5, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(book.phone_number, M + 5, y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('BOOKING REFERENCE ID', M + 5, y + 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text(book.booking_ref || book.booking_id.toUpperCase(), M + 5, y + 26);

    // QR Code and Ticket Number on the right
    if (book.qr_code_data) {
      const qrX = M + cW / 2 + 2;
      const qrW = cW / 2 - 2;
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(qrX, y, qrW, 35, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.roundedRect(qrX, y, qrW, 35, 1.5, 1.5, 'S');

      // Add QR Image
      doc.addImage(book.qr_code_data, 'PNG', qrX + 5, y + 5, 25, 25);

      // Label on the right of the QR code
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DIGITAL TICKET', qrX + 34, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Scan to verify live', qrX + 34, y + 14);
      doc.text('at gotogethertrip.com', qrX + 34, y + 17);

      // Ticket number
      if (book.ticket_number) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(234, 88, 12);
        doc.text(`TKT NO: ${book.ticket_number}`, qrX + 34, y + 23);
      }
    }
    y += 40;

    // ═══════════════════════════════════════════════════════════════
    // IMPORTANT NOTES BOX
    // ═══════════════════════════════════════════════════════════════
    doc.setFillColor(255, 251, 235);
    doc.roundedRect(M, y, cW, 28, 1.5, 1.5, 'F');
    doc.setDrawColor(253, 224, 71);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, cW, 28, 1.5, 1.5, 'S');

    // Amber accent bar on left
    doc.setFillColor(245, 158, 11);
    doc.rect(M, y, 1.5, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text('IMPORTANT INFORMATION', M + 5, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(120, 53, 15);
    const notes = [
      'Please carry a valid government-issued photo ID for all passengers.',
      'Report to the pickup point at least 30 minutes before departure.',
      'This confirmation is subject to the terms & conditions agreed at booking.',
      'For cancellations or changes, contact the organizer or visit your dashboard.',
    ];
    let ny = y + 10;
    notes.forEach((note) => {
      doc.setFillColor(245, 158, 11);
      doc.circle(M + 5.5, ny - 0.8, 0.6, 'F');
      doc.text(note, M + 9, ny);
      ny += 4.5;
    });

    // ═══════════════════════════════════════════════════════════════
    // FOOTER
    // ═══════════════════════════════════════════════════════════════
    const fY = H - 28;

    // Top accent line
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(M, fY, M + cW, fY);

    // Thin orange line
    doc.setFillColor(245, 158, 11);
    doc.rect(M, fY, 30, 0.6, 'F');

    // Left column
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('This is an electronically generated document.', M, fY + 5);
    doc.text('No physical signature is required.', M, fY + 8.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(`Document ID: ${fullRef}`, M, fY + 13);
    const genDate = now.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
    const genTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
    doc.text(`Generated: ${genDate} at ${genTime}`, M, fY + 16.5);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('GoTogether', M + cW, fY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('www.gotogethertrip.com', M + cW, fY + 9, { align: 'right' });
    doc.text('support@gotogethertrip.com', M + cW, fY + 12.5, { align: 'right' });
    doc.text(`\u00A9 ${now.getFullYear()} GoTogether. All rights reserved.`, M + cW, fY + 16.5, { align: 'right' });

    // Bottom decorative bar
    doc.setFillColor(15, 23, 42);
    doc.rect(M, H - 10, cW, 2.5, 'F');
    doc.setFillColor(245, 158, 11);
    doc.rect(M, H - 10, 25, 2.5, 'F');

    doc.save(`GoTogether-Booking-${ref}.pdf`);
  };


  const handleCancelBooking = async (tripId: string, bookingId: string) => {
    if (!confirm("Cancel this booking? This cannot be undone.")) return;
    setCancelling(bookingId);
    try {
      const res = await fetch(`/api/trips/${tripId}/bookings/${bookingId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        await fetchData();
      } else {
        alert(data.error || "Failed to cancel booking");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setCancelling(null);
    }
  };

  const getTripEndTime = (book: Booking) => {
    const start = new Date(book.trip_date).getTime();
    if (!Number.isFinite(start)) return 0;
    const durationDays = Math.max(1, Number(book.duration_days || 1));
    return start + durationDays * 24 * 60 * 60 * 1000;
  };

  const isCancelledBooking = (book: Booking) =>
    book.booking_status === 'cancelled' ||
    book.booking_status === 'trip_cancelled' ||
    book.booking_status === 'refund_pending' ||
    book.booking_status === 'refund_failed' ||
    book.payment_status === 'refunded' ||
    !!book.cancelled_at ||
    book.legacy_status === 'rejected';

  const isCompletedBooking = (book: Booking) =>
    book.booking_status === 'confirmed' && getTripEndTime(book) > 0 && getTripEndTime(book) < now;
  const visibleBookings = bookings.filter((book) => {
    if (isPaymentWindowBooking(book)) return getPaymentMsRemaining(book) > 0;
    if (book.booking_status === 'expired' && (book.payment_status === 'pending' || book.payment_status === 'unpaid')) return false;
    return true;
  });
  const historyBookings = visibleBookings.filter((book) => isCancelledBooking(book) || isCompletedBooking(book));
  const activeBookings = visibleBookings.filter((book) => !historyBookings.some((historyBook) => historyBook.booking_id === book.booking_id));
  const displayedBookings = premiumView === 'history' ? historyBookings : activeBookings;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pt-8 pb-20 px-4">
      {/* Back Link */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to Profile
      </Link>

      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-8 md:p-10 text-white shadow-xl shadow-orange-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">My Bookings</h1>
              <p className="text-white/70 mt-1">Track your applications and bookings</p>
            </div>
            <div className="flex p-1 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20">
              <button
                onClick={() => setActiveTab('buddy')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'buddy' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Buddy Trips
              </button>
              <button
                onClick={() => setActiveTab('premium')}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === 'premium' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                Curated Adventures
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'buddy' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          {requests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full blur-3xl opacity-60 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">No buddy applications</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">Find a buddy trip and show interest to get started!</p>
                <button 
                  onClick={() => router.push('/buddy')}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Find Buddy Trips
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {requests.map(req => (
                <div key={req.request_id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-slate-900 line-clamp-2">{req.title}</h3>
                      <div className="ml-4">
                        {req.request_status === 'pending' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 text-yellow-700 text-xs font-bold rounded-full border border-yellow-200 whitespace-nowrap">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                        {req.request_status === 'accepted' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5" /> Accepted
                          </span>
                        )}
                        {req.request_status === 'rejected' && (
                          <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 text-xs font-bold rounded-full border border-rose-200 whitespace-nowrap">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="text-sm font-medium">{req.destination}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                        <span className="text-sm font-medium">{req.duration_days} Days</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">O</div>
                        <span className="text-sm font-medium">Organizer: {req.organizer_name}</span>
                      </div>
                    </div>
                  </div>

                  {req.request_status === 'accepted' ? (
                    <div className="p-4 bg-emerald-50 border-t border-emerald-100">
                      <button
                        onClick={() => router.push(`/chat/${req.trip_id}`)}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                      >
                        Go to Trip Chat
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs text-slate-500 font-medium">
                        {req.request_status === 'pending' ? 'Waiting for approval...' : 'Application declined'}
                      </p>
                      <Link href={`/buddy`} className="text-xs font-bold text-orange-500 hover:underline">View more trips</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'premium' && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{premiumView === 'history' ? 'Trip History' : 'Active Bookings'}</h2>
              <p className="text-sm text-slate-500">{premiumView === 'history' ? 'Completed and cancelled trips are stored here.' : 'Upcoming and in-progress bookings stay here.'}</p>
            </div>
            <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setPremiumView('active')}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${premiumView === 'active' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Active ({activeBookings.length})
              </button>
              <button
                type="button"
                onClick={() => setPremiumView('history')}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all ${premiumView === 'history' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                Trip History ({historyBookings.length})
              </button>
            </div>
          </div>

          {displayedBookings.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full blur-3xl opacity-60 -translate-y-1/2" />
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center mx-auto mb-6">
                  <Calendar className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{premiumView === 'history' ? 'No trip history yet' : 'No active bookings'}</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">{premiumView === 'history' ? 'Completed and cancelled trips will appear here automatically.' : 'Explore our premium curated adventures and book your next trip!'}</p>
                <button 
                  onClick={() => router.push('/trips')}
                  className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-orange-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                >
                  Browse Adventures
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedBookings.map(book => {
                const names = parseNames(book.names);
                const totalPeople = book.male_count + book.female_count + book.child_count;
                
                const paymentMsRemaining = getPaymentMsRemaining(book);
                const paymentCountdown = formatPaymentCountdown(paymentMsRemaining);
                const isConfirmed = book.booking_status === 'confirmed' || (book.legacy_status === 'approved' && book.booking_status !== 'pending_payment');
                const isPendingPayment = isPendingPaymentVisible(book);
                const isLegacyPending = book.booking_status === 'pending' || (book.legacy_status === 'pending' && book.booking_status !== 'pending_payment');
                const isTripCancelled = book.booking_status === 'trip_cancelled';
                const isCancelled = book.booking_status === 'cancelled' || isTripCancelled || !!book.cancelled_at || book.legacy_status === 'rejected';
                const isExpired = book.booking_status === 'expired';
                const hasCapturedPayment = !!book.razorpay_payment_id || ['paid', 'refunded', 'refund_pending', 'refund_failed'].includes(book.payment_status);
                
                return (
                  <div key={book.booking_id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group">
                    {book.image_url && (
                      <div className="h-32 w-full relative">
                        <Image src={book.image_url} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                          <h3 className="text-lg font-bold text-white line-clamp-1">{book.title}</h3>
                          <div className="shrink-0">
                            {isTripCancelled ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm animate-pulse">
                                Trip Cancelled
                              </span>
                            ) : isCancelled ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-400 text-slate-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Cancelled
                              </span>
                            ) : isExpired ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-500 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Expired
                              </span>
                            ) : isPendingPayment ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400 text-amber-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm animate-pulse">
                                Awaiting Payment
                              </span>
                            ) : isLegacyPending ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-yellow-400 text-yellow-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Pending Review
                              </span>
                            ) : isConfirmed ? (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-400 text-emerald-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Confirmed
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-400 text-rose-900 text-[10px] uppercase tracking-wider font-extrabold rounded-full shadow-sm">
                                Rejected
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-5 flex-1">
                      {!book.image_url && (
                        <div className="flex justify-between items-start mb-4">
                          <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{book.title}</h3>
                          <span className={`px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-full ${
                            isTripCancelled ? 'bg-rose-100 text-rose-700 animate-pulse' :
                            isCancelled ? 'bg-slate-100 text-slate-600' :
                            isExpired ? 'bg-slate-200 text-slate-700' :
                            isPendingPayment ? 'bg-amber-100 text-amber-700' :
                            isLegacyPending ? 'bg-yellow-100 text-yellow-700' :
                            isConfirmed ? 'bg-emerald-100 text-emerald-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                            {isTripCancelled ? 'Trip Cancelled' : isCancelled ? 'Cancelled' : isExpired ? 'Expired' : isPendingPayment ? 'Awaiting Payment' : isLegacyPending ? 'Pending Review' : isConfirmed ? 'Confirmed' : 'Rejected'}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate" title={book.destination}>{book.destination}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate">{new Date(book.trip_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-orange-400 shrink-0" />
                          <span>{totalPeople} People</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                          <span className="truncate">{book.phone_number}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">Passenger Details</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {names.map((n, i) => (
                          <span key={i} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            {n}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500">
                        {book.male_count > 0 && <span>Male: {book.male_count}</span>}
                        {book.female_count > 0 && <span>Female: {book.female_count}</span>}
                        {book.child_count > 0 && <span>Children: {book.child_count}</span>}
                      </div>

                      {isPendingPayment && (
                        <div className="mt-3 pt-3 border-t border-amber-100 text-xs bg-amber-50 p-3 rounded-xl border border-amber-100">
                          <div className="flex items-center justify-between gap-3 font-bold text-amber-800">
                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Payment window</span>
                            <span>{paymentCountdown} left</span>
                          </div>
                          <div className="mt-1 text-[10px] text-amber-700">Complete payment before this timer ends. After 12 hours, this booking leaves your dashboard.</div>
                        </div>
                      )}

                      {isConfirmed && (() => {
                        const estimate = getCancellationEstimate(book.trip_date, book.amount || 0);
                        return (
                          <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 bg-orange-50/50 p-2.5 rounded-xl border border-orange-100/50">
                            <div className="flex justify-between font-bold text-slate-700">
                              <span>Cancellation Policy:</span>
                              <span className={estimate.allowed ? "text-emerald-600" : "text-rose-600"}>{estimate.text}</span>
                            </div>
                            {estimate.allowed && (
                              <div className="grid grid-cols-2 text-slate-500 mt-1">
                                <span>Refund Amount: <strong className="text-slate-800">₹{(estimate.amount / 100).toLocaleString('en-IN')}</strong></span>
                                <span>Cancel Fee: <strong className="text-slate-800">₹{(estimate.fee / 100).toLocaleString('en-IN')}</strong></span>
                              </div>
                            )}
                            <div className="text-[10px] text-slate-400 mt-1">Refund ETA: 5-7 business days from gateway processing.</div>
                          </div>
                        );
                      })()}

                      {(isCancelled || isTripCancelled) && (
                        <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>Cancellation Status:</span>
                            <span className="text-rose-600 font-extrabold capitalize">
                              {!hasCapturedPayment ? 'no payment' : isTripCancelled ? (book.refund_status === 'success' ? 'refunded' : (book.refund_status || 'processing')) : (book.refund_status || 'no_refund')}
                            </span>
                          </div>
                          {isTripCancelled ? (
                            <>
                              <div className="grid grid-cols-2 text-slate-500 mt-1">
                                <span>Refund Amount: <strong className="text-slate-800">&#8377;{(hasCapturedPayment ? ((book.amount || 0) / 100) : 0).toLocaleString('en-IN')}</strong></span>
                                <span>Fee Charged: <strong className="text-slate-800">₹0</strong></span>
                              </div>
                              {book.booking_ref && (
                                <div className="text-[10px] text-slate-500 font-semibold mt-1">
                                  Booking Ref: {book.booking_ref}
                                </div>
                              )}
                              {book.trip_cancel_reason && (
                                <div className="text-[10px] text-rose-700 mt-1 bg-rose-50/50 p-1.5 rounded border border-rose-100/50 font-medium">
                                  <strong>Reason ({book.trip_cancel_reason_type || 'Organizer Cancel'}):</strong> {book.trip_cancel_reason}
                                </div>
                              )}
                              {hasCapturedPayment ? (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  Refund ETA: 5-7 business days from gateway processing.
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  No payment was captured for this booking.
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 text-slate-500 mt-1">
                                <span>Refunded: <strong className="text-slate-800">&#8377;{(hasCapturedPayment ? ((book.refund_amount || 0) / 100) : 0).toLocaleString('en-IN')}</strong></span>
                                <span>Fee Charged: <strong className="text-slate-800">&#8377;{(hasCapturedPayment ? ((book.cancellation_fee || 0) / 100) : 0).toLocaleString('en-IN')}</strong></span>
                              </div>
                              {!hasCapturedPayment && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  No payment was captured for this booking.
                                </div>
                              )}
                              {book.cancellation_date && (
                                <div className="text-[10px] text-slate-400 mt-1">
                                  Cancelled: {new Date(book.cancellation_date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center gap-2">
                      <p className="text-xs text-slate-500 font-medium truncate">
                        Organizer: <span className="font-bold text-slate-700">{book.organizer_name}</span>
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {isPendingPayment && (
                          <Link
                            href={`/trips/${book.trip_slug || book.trip_id}?booking_id=${book.booking_id}`}
                            className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-white hover:bg-amber-500 border border-amber-200 hover:border-amber-500 px-2.5 py-1 rounded-lg transition-all"
                          >
                            Pay Now
                          </Link>
                        )}
                        {(isPendingPayment || isLegacyPending || (isConfirmed && getCancellationEstimate(book.trip_date, book.amount || 0).allowed)) && !isCancelled && (
                          <button
                            onClick={() => handleCancelBooking(book.trip_id, book.booking_id)}
                            disabled={cancelling === book.booking_id}
                            className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-rose-500 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                          >
                            {cancelling === book.booking_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            Cancel
                          </button>
                        )}
                        {isConfirmed && (
                          <button
                            onClick={() => downloadConfirmationPDF(book)}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-white hover:bg-emerald-500 border border-emerald-200 hover:border-emerald-500 px-2.5 py-1 rounded-lg transition-all"
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        )}
                        <Link href={`/trips/${book.trip_slug || book.trip_id}`} className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-all">
                          View Trip <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}









