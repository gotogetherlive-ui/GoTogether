"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import Image from "next/image";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
  reviewer_avatar: string | null;
  reviewee_name: string;
  reviewee_id: string;
  is_mine: number;
}

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => onChange && setHovered(0)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= (hovered || value) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsSection({
  tripId,
  organizerId,
  currentUserId,
  isParticipant,
}: {
  tripId: string;
  organizerId: string;
  currentUserId: string | null;
  isParticipant: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews/${tripId}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setAvgRating(data.avgRating);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReviews(); }, [tripId]);

  const alreadyReviewed = reviews.some((r) => r.is_mine === 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trip_id: tripId, reviewee_id: organizerId, rating, comment }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "Review submitted!", ok: true });
        setRating(0);
        setComment("");
        fetchReviews();
      } else {
        setMessage({ text: data.error || "Failed to submit", ok: false });
      }
    } catch {
      setMessage({ text: "An error occurred", ok: false });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Reviews</h3>
        {avgRating !== null && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            <StarRating value={Math.round(avgRating)} />
            <span className="text-sm font-bold text-amber-700">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-slate-400">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Submit Review Form */}
      {currentUserId && isParticipant && !alreadyReviewed && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-700">Leave a review for the organizer</p>
          <StarRating value={rating} onChange={setRating} />
          <textarea
            rows={3}
            placeholder="Share your experience (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none resize-none text-sm"
          />
          {message && (
            <p className={`text-sm font-medium ${message.ok ? "text-emerald-600" : "text-rose-600"}`}>{message.text}</p>
          )}
          <button
            type="submit"
            disabled={!rating || submitting}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Review
          </button>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
      ) : reviews.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-6">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="relative w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {r.reviewer_avatar ? (
                    <Image src={r.reviewer_avatar} alt="" fill className="object-cover" sizes="36px" />
                  ) : (
                    r.reviewer_name?.charAt(0)?.toUpperCase()
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{r.reviewer_name}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(r.created_at + "Z").toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="ml-auto"><StarRating value={r.rating} /></div>
              </div>
              {r.comment && <p className="text-sm text-slate-600 leading-relaxed">{r.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
