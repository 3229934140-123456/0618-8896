import { useState, useEffect } from 'react';
import { Star, Key, Hash, CreditCard } from 'lucide-react';
import { api } from '@/api';
import type { Booking } from '@/types';

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'confirmed', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'checked_in', label: '已入住' },
  { key: 'checked_out', label: '已完成' },
  { key: 'cancelled', label: '已取消' },
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: '待支付', color: 'bg-blue-100 text-blue-700' },
  paid: { label: '已支付', color: 'bg-green-100 text-green-700' },
  checked_in: { label: '已入住', color: 'bg-indigo-100 text-indigo-700' },
  checked_out: { label: '已完成', color: 'bg-gray-100 text-gray-600' },
  cancelled: { label: '已取消', color: 'bg-red-100 text-red-700' },
};

export default function GuestBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBookings = () => {
    api.bookings.getByGuest().then((res) => {
      if (res.success) setBookings(res.data);
    });
  };

  useEffect(() => {
    fetchBookings();
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
      fetchBookings();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePay = async (bookingId: string) => {
    if (!confirm(`确定要支付该预订的全额费用吗？`)) return;
    const res = await api.bookings.pay(bookingId, 'wechat');
    if (res.success) {
      alert('支付成功！确认码和门锁密码已生成');
      fetchBookings();
    } else {
      alert('支付失败：' + (res.error || ''));
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm(`确定要取消该预订吗？`)) return;
    const res = await api.bookings.updateStatus(bookingId, 'cancelled');
    if (res.success) {
      alert('预订已取消');
      fetchBookings();
    } else {
      alert('取消失败：' + (res.error || ''));
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

                    {b.status === 'paid' && (
                      <div className="mt-3 flex flex-wrap gap-4 rounded-xl bg-green-50 p-3 text-sm">
                        <span className="flex items-center gap-1 text-green-700">
                          <Hash className="h-4 w-4" />确认码: {b.confirmationCode}
                        </span>
                        <span className="flex items-center gap-1 text-green-700">
                          <Key className="h-4 w-4" />门锁密码: {b.doorPassword}
                        </span>
                      </div>
                    )}

                    {(b.status === 'confirmed') && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handlePay(b.id)}
                          className="flex items-center gap-1 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                        >
                          <CreditCard className="h-4 w-4" />
                          立即支付
                        </button>
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="rounded-xl border border-surface-200 px-4 py-2 text-sm text-brand-800/70 hover:bg-surface-50"
                        >
                          取消预订
                        </button>
                      </div>
                    )}

                    {b.status === 'pending' && (
                      <div className="mt-3">
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          取消预订
                        </button>
                      </div>
                    )}

                    {b.status === 'checked_out' && (
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
