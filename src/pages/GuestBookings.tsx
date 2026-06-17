import { useState, useEffect } from 'react';
import { Star, Key, Hash } from 'lucide-react';
import { api } from '@/api';
import type { Booking } from '@/types';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '已确认' },
  { key: 'checkedin', label: '已入住' },
  { key: 'checkedout', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '已确认', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700' },
  checkedin: { label: '已入住', color: 'bg-blue-100 text-blue-700' },
  checkedout: { label: '已完成', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function GuestBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.bookings.getByGuest().then((res) => {
      if (res.success) setBookings(res.data);
    });
  }, []);

  const filtered = activeTab === 'all' ? bookings : bookings.filter((b) => b.status === activeTab);

  const handleSubmitReview = async (bookingId: string) => {
    setSubmitting(true);
    try {
      await api.reviews.create({
        bookingId,
        rating,
        comment,
        type: 'guest_to_listing',
      });
      setReviewingId(null);
      setRating(5);
      setComment('');
      const res = await api.bookings.getByGuest();
      if (res.success) setBookings(res.data);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="section-title mb-6">我的预订</h1>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-brand-500 text-white'
                : 'bg-surface-100 text-brand-800 hover:bg-surface-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((b) => {
            const statusInfo = STATUS_MAP[b.status] || { label: b.status, color: 'bg-gray-100 text-gray-600' };
            return (
              <div key={b.id} className="card overflow-hidden">
                <div className="flex gap-4 p-5">
                  {b.listingImage && (
                    <img
                      src={b.listingImage}
                      alt={b.listingTitle}
                      className="h-24 w-24 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold text-brand-800">{b.listingTitle || '房源'}</h3>
                      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-surface-300">{b.listingCity}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-800/70">
                      <span>{b.checkIn} 至 {b.checkOut}</span>
                      <span>{b.guests} 位房客</span>
                      <span className="font-semibold text-brand-800">¥{b.totalPrice}</span>
                    </div>

                    {b.status === 'confirmed' && (
                      <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-green-50 p-3 text-sm">
                        <span className="flex items-center gap-1 text-green-700">
                          <Hash className="h-4 w-4" />确认码: {b.confirmationCode}
                        </span>
                        <span className="flex items-center gap-1 text-green-700">
                          <Key className="h-4 w-4" />门锁密码: {b.doorPassword}
                        </span>
                      </div>
                    )}

                    {b.status === 'checkedout' && (
                      <div className="mt-3">
                        {reviewingId === b.id ? (
                          <div className="rounded-xl bg-surface-50 p-4">
                            <div className="mb-3 flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((v) => (
                                <button
                                  key={v}
                                  onClick={() => setRating(v)}
                                  className="p-0.5"
                                >
                                  <Star
                                    className={`h-6 w-6 ${
                                      v <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-surface-200'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="分享你的住宿体验..."
                              className="mb-3 w-full rounded-xl border border-surface-200 p-3 text-sm outline-none focus:border-brand-400"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSubmitReview(b.id)}
                                disabled={submitting || !comment.trim()}
                                className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                              >
                                {submitting ? '提交中...' : '提交评价'}
                              </button>
                              <button
                                onClick={() => { setReviewingId(null); setRating(5); setComment(''); }}
                                className="rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-surface-50"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReviewingId(b.id)}
                            className="rounded-xl bg-brand-50 px-4 py-2 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-100"
                          >
                            评价房源
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex h-48 items-center justify-center text-surface-300">
          暂无预订记录
        </div>
      )}
    </div>
  );
}
