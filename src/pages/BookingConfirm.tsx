import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api';
import type { Booking } from '@/types';
import { Check, Lock, Calendar } from 'lucide-react';

export default function BookingConfirm() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    api.bookings
      .getByGuest()
      .then((res) => {
        if (res.success && res.data) {
          const found = res.data.find((b) => b.id === bookingId);
          if (found) setBooking(found);
        }
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-brand-500 text-lg">加载中...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-50">
        <div className="text-center">
          <p className="text-brand-800 text-lg">预订未找到</p>
          <Link to="/" className="mt-4 inline-block text-brand-500 hover:text-brand-600 text-sm">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check size={32} className="text-success" />
          </div>
          <h1 className="section-title text-2xl">预订确认</h1>
        </div>

        <div className="space-y-3 rounded-xl bg-surface-50 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-brand-800/60">确认码</span>
            <span className="font-semibold text-brand-800">{booking.confirmationCode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-800/60">门锁密码</span>
            <span className="flex items-center gap-1 font-semibold text-brand-800">
              <Lock size={14} className="text-brand-500" />
              {booking.doorPassword}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-800/60">房源名称</span>
            <span className="font-medium text-brand-800">{booking.listingTitle || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-brand-800/60">
              <Calendar size={14} />
              入住日期
            </span>
            <span className="font-medium text-brand-800">{booking.checkIn}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1 text-brand-800/60">
              <Calendar size={14} />
              退房日期
            </span>
            <span className="font-medium text-brand-800">{booking.checkOut}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-brand-800/60">总价</span>
            <span className="font-semibold text-brand-800">¥{booking.totalPrice}</span>
          </div>
          {booking.checkInInstructions && (
            <div className="border-t border-surface-200 pt-3">
              <span className="text-sm text-brand-800/60">入住说明</span>
              <p className="mt-1 text-sm text-brand-800">{booking.checkInInstructions}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <Link to="/" className="btn-secondary flex-1 text-center">
            返回首页
          </Link>
          <Link to="/guest/bookings" className="btn-primary flex-1 text-center">
            查看我的预订
          </Link>
        </div>
      </div>
    </div>
  );
}
