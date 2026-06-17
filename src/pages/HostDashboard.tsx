import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, CalendarDays, ClipboardList, Star, Plus, Calendar, FileText } from 'lucide-react';
import { api } from '@/api';
import { useAuthStore } from '@/store';
import type { Listing, Booking } from '@/types';

export default function HostDashboard() {
  const { user } = useAuthStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.listings.getByHost(), api.bookings.getByHost()])
      .then(([listingsRes, bookingsRes]) => {
        if (listingsRes.success) setListings(listingsRes.data);
        if (bookingsRes.success) setBookings(bookingsRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalListings = listings.length;
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter((b) => b.status === 'pending').length;
  const totalReviews = listings.reduce((sum, l) => sum + l.reviewCount, 0);
  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusLabels: Record<string, string> = {
    pending: '待确认',
    confirmed: '已确认',
    rejected: '已拒绝',
    checkedin: '已入住',
    checkedout: '已退房',
    cancelled: '已取消',
  };

  const statusBadge: Record<string, string> = {
    pending: 'badge-warning',
    confirmed: 'badge-info',
    rejected: 'badge-danger',
    checkedin: 'badge-success',
    checkedout: 'badge-brand',
    cancelled: 'badge-danger',
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="section-title mb-2">欢迎回来, {user?.name || '房东'}</h1>
          <p className="text-brand-800/60">管理你的房源和订单</p>
        </div>

        <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100">
                <Home size={22} className="text-brand-500" />
              </div>
              <div>
                <p className="text-sm text-brand-800/60">房源数量</p>
                <p className="text-2xl font-bold text-brand-800">{totalListings}</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100">
                <ClipboardList size={22} className="text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-brand-800/60">总订单数</p>
                <p className="text-2xl font-bold text-brand-800">{totalBookings}</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100">
                <CalendarDays size={22} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-brand-800/60">待确认订单</p>
                <p className="text-2xl font-bold text-brand-800">{pendingBookings}</p>
              </div>
            </div>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100">
                <Star size={22} className="text-green-500" />
              </div>
              <div>
                <p className="text-sm text-brand-800/60">总评价数</p>
                <p className="text-2xl font-bold text-brand-800">{totalReviews}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="section-title mb-4">最近订单</h2>
          <div className="card">
            {recentBookings.length === 0 ? (
              <div className="p-8 text-center text-brand-800/50">暂无订单</div>
            ) : (
              <div className="divide-y divide-surface-200">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center gap-4 p-4">
                    <div className="flex-1">
                      <p className="font-medium text-brand-800">{booking.listingTitle || '房源'}</p>
                      <p className="text-sm text-brand-800/60">
                        {booking.guestName || '房客'} · {booking.checkIn} ~ {booking.checkOut} · {booking.guests}人
                      </p>
                    </div>
                    <span className="font-semibold text-brand-800">¥{booking.totalPrice}</span>
                    <span className={statusBadge[booking.status]}>{statusLabels[booking.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="section-title mb-4">快捷操作</h2>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/host/listings/new"
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              添加房源
            </Link>
            <Link
              to="/host/listings"
              className="btn-secondary flex items-center gap-2"
            >
              <Calendar size={18} />
              管理日历
            </Link>
            <Link
              to="/host/bookings"
              className="btn-secondary flex items-center gap-2"
            >
              <FileText size={18} />
              查看订单
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
