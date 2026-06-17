import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle, Star, Home, ClipboardList, MessageSquare } from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store';
import type { Booking } from '@/types';

export default function GuestDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    api.bookings.getByGuest().then((res) => {
      if (res.success) setBookings(res.data);
    });
  }, []);

  const upcoming = bookings.filter((b) => b.status === 'confirmed').slice(0, 3);
  const completedCount = bookings.filter((b) => b.status === 'checkedout').length;
  const reviewedCount = bookings.filter((b) => b.status === 'checkedout').length;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-brand-800">
        你好，{user?.name || '租客'}
      </h1>

      <div className="mb-10 grid gap-6 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-surface-300">即将入住</p>
            <p className="text-2xl font-bold text-brand-800">{upcoming.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-600">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-surface-300">已完成住宿</p>
            <p className="text-2xl font-bold text-brand-800">{completedCount}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-600">
            <Star className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-surface-300">已写评价</p>
            <p className="text-2xl font-bold text-brand-800">{reviewedCount}</p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="section-title mb-4">即将到来的预订</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-4">
            {upcoming.map((b) => (
              <div key={b.id} className="card flex items-center gap-4 p-5">
                {b.listingImage && (
                  <img
                    src={b.listingImage}
                    alt={b.listingTitle}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-brand-800">{b.listingTitle || '房源'}</p>
                  <p className="text-sm text-surface-300">
                    {b.listingCity} · {b.checkIn} 至 {b.checkOut}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  已确认
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="card flex h-32 items-center justify-center text-surface-300">
            暂无即将到来的预订
          </div>
        )}
      </div>

      <div>
        <h2 className="section-title mb-4">快捷入口</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link
            to="/search"
            className="card flex items-center gap-3 p-5 transition-colors hover:bg-brand-50"
          >
            <Home className="h-5 w-5 text-brand-500" />
            <span className="font-medium text-brand-800">浏览房源</span>
          </Link>
          <Link
            to="/guest/bookings"
            className="card flex items-center gap-3 p-5 transition-colors hover:bg-brand-50"
          >
            <ClipboardList className="h-5 w-5 text-brand-500" />
            <span className="font-medium text-brand-800">我的预订</span>
          </Link>
          <Link
            to="/guest/reviews"
            className="card flex items-center gap-3 p-5 transition-colors hover:bg-brand-50"
          >
            <MessageSquare className="h-5 w-5 text-brand-500" />
            <span className="font-medium text-brand-800">我的评价</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
