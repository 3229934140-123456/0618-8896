import { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import { api } from '@/api';
import type { Review, Booking } from '@/types';
import { useAuthStore } from '@/store';

export default function HostReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingBookingId, setReviewingBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user) return;
    Promise.all([api.reviews.getByHost(user.id), api.bookings.getByHost()])
      .then(([reviewsRes, bookingsRes]) => {
        if (reviewsRes.success) setReviews(reviewsRes.data);
        if (bookingsRes.success) setBookings(bookingsRes.data);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const reviewedBookingIds = new Set(
    reviews.filter((r) => r.type === 'host_to_guest').map((r) => r.bookingId)
  );

  const uncheckedBookings = bookings.filter(
    (b) => b.status === 'checked_out' && !reviewedBookingIds.has(b.id)
  );

  const handleSubmitReview = async () => {
    if (!reviewingBookingId || !reviewComment.trim() || !user) return;
    setSubmitting(true);
    try {
      await api.reviews.create({
        bookingId: reviewingBookingId,
        rating: reviewRating,
        comment: reviewComment,
        type: 'host_to_guest',
      });
      setReviewingBookingId(null);
      setReviewRating(5);
      setReviewComment('');
      const res = await api.reviews.getByHost(user.id);
      if (res.success) setReviews(res.data);
    } finally {
      setSubmitting(false);
    }
  };

  const guestReviews = reviews.filter((r) => r.type === 'guest_to_listing');

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h1 className="section-title mb-6">房客评价</h1>

        <div className="mb-10">
          <h2 className="mb-4 text-xl font-semibold text-brand-800">收到的评价</h2>
          {guestReviews.length === 0 ? (
            <div className="card p-8 text-center text-brand-800/50">暂无房客评价</div>
          ) : (
            <div className="space-y-4">
              {guestReviews.map((review) => (
                <div key={review.id} className="card p-5">
                  <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-200 text-sm font-semibold text-brand-800">
                      {(review.fromUserName || '匿')[0]}
                    </div>
                    <div>
                      <p className="font-medium text-brand-800">{review.fromUserName || '匿名用户'}</p>
                      <p className="text-xs text-brand-800/50">{new Date(review.createdAt).toLocaleDateString('zh-CN')}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < Math.round(review.rating) ? 'fill-brand-400 text-brand-400' : 'text-surface-200'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-brand-800/80">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-brand-800">评价房客</h2>
          {uncheckedBookings.length === 0 ? (
            <div className="card p-8 text-center text-brand-800/50">暂无待评价的房客</div>
          ) : (
            <div className="space-y-4">
              {uncheckedBookings.map((booking) => (
                <div key={booking.id} className="card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-brand-800">{booking.listingTitle || '房源'}</p>
                      <p className="text-sm text-brand-800/60">
                        房客: {booking.guestName || '未知'} · {booking.checkIn} ~ {booking.checkOut}
                      </p>
                    </div>
                    {reviewingBookingId !== booking.id && (
                      <button
                        onClick={() => {
                          setReviewingBookingId(booking.id);
                          setReviewRating(5);
                          setReviewComment('');
                        }}
                        className="btn-primary btn-sm flex items-center gap-1.5"
                      >
                        <Star size={14} />
                        评价房客
                      </button>
                    )}
                  </div>

                  {reviewingBookingId === booking.id && (
                    <div className="mt-4 space-y-4 border-t border-surface-200 pt-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-brand-800">评分</label>
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setReviewRating(i + 1)}
                              className="transition-transform hover:scale-110"
                            >
                              <Star
                                size={28}
                                className={i < reviewRating ? 'fill-brand-400 text-brand-400' : 'text-surface-200'}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-brand-800">评价内容</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={3}
                          className="input-field resize-none"
                          placeholder="写下你对房客的评价..."
                        />
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={handleSubmitReview}
                          disabled={submitting || !reviewComment.trim()}
                          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Send size={16} />
                          {submitting ? '提交中...' : '提交评价'}
                        </button>
                        <button
                          onClick={() => setReviewingBookingId(null)}
                          className="btn-secondary btn-sm"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
