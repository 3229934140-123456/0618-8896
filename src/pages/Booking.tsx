import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api';
import type { Booking } from '@/types';
import { Check, CreditCard, Lock, Mail, ArrowRight, Calendar, Users } from 'lucide-react';

const STEPS = ['确认订单', '支付', '完成'];

function daysBetween(a: string, b: string): number {
  const d1 = new Date(a);
  const d2 = new Date(b);
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Booking() {
  const { listingId } = useParams<{ listingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    listingTitle?: string;
    listingImage?: string;
    basePrice?: number;
    cleaningFee?: number;
  } | null;

  const checkIn = state?.checkIn || '';
  const checkOut = state?.checkOut || '';
  const guests = state?.guests || 1;
  const listingTitle = state?.listingTitle || '房源';
  const listingImage = state?.listingImage || '';
  const basePrice = state?.basePrice || 0;
  const cleaningFee = state?.cleaningFee || 0;

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const subtotal = basePrice * nights;
  const totalPrice = subtotal + cleaningFee;

  const [step, setStep] = useState(1);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  useEffect(() => {
    if (!listingId || !checkIn || !checkOut) return;
    setLoading(true);
    api.bookings
      .create({ listingId, checkIn, checkOut, guests })
      .then((res) => {
        if (res.success) {
          setBooking(res.data);
        } else {
          setError(res.message || '创建预订失败');
        }
      })
      .catch(() => setError('网络错误，请稍后重试'))
      .finally(() => setLoading(false));
  }, [listingId, checkIn, checkOut, guests]);

  function handleConfirmAndPay() {
    if (!guestName.trim() || !guestPhone.trim()) return;
    setStep(2);
  }

  function handlePayment() {
    if (!booking) return;
    setLoading(true);
    api.bookings
      .pay(booking.id, 'credit_card')
      .then((res) => {
        if (res.success) {
          setBooking(res.data);
          setStep(3);
        } else {
          setError(res.message || '支付失败');
        }
      })
      .catch(() => setError('网络错误，请稍后重试'))
      .finally(() => setLoading(false));
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-10 flex items-center justify-center">
          {STEPS.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white'
                        : isCompleted
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-200 text-surface-300'
                    }`}
                  >
                    {isCompleted ? <Check size={18} /> : stepNum}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      isActive ? 'text-brand-500' : isCompleted ? 'text-brand-800' : 'text-surface-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-3 h-0.5 w-16 rounded ${
                      step > stepNum ? 'bg-brand-500' : 'bg-surface-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="section-title mb-4 text-xl">房源信息</h2>
              <div className="flex gap-4">
                {listingImage && (
                  <img
                    src={listingImage}
                    alt={listingTitle}
                    className="h-24 w-24 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-brand-800">{listingTitle}</h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-brand-800/70">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-brand-500" />
                      {checkIn} → {checkOut}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users size={14} className="text-brand-500" />
                      {guests} 位房客
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-brand-500" />
                      {nights} 晚
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-2 border-t border-surface-200 pt-4">
                <div className="flex justify-between text-sm text-brand-800/70">
                  <span>¥{basePrice} × {nights} 晚</span>
                  <span>¥{subtotal}</span>
                </div>
                {cleaningFee > 0 && (
                  <div className="flex justify-between text-sm text-brand-800/70">
                    <span>清洁费</span>
                    <span>¥{cleaningFee}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-surface-200 pt-2 font-semibold text-brand-800">
                  <span>总价</span>
                  <span>¥{totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="section-title mb-4 text-xl">房客信息</h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-800/70">姓名</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="请输入您的姓名"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-800/70">手机号码</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="请输入手机号码"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-800/70">特殊需求</label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="如有特殊需求请在此说明"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmAndPay}
              disabled={!guestName.trim() || !guestPhone.trim() || loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认并支付
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="section-title mb-4 text-xl flex items-center gap-2">
                <CreditCard size={22} className="text-brand-500" />
                支付方式
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-brand-800/70">卡号</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4242 4242 4242 4242"
                      className="input-field pr-10"
                    />
                    <CreditCard size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300" />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-brand-800/70">有效期</label>
                    <input
                      type="text"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="input-field"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-brand-800/70">CVV</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        placeholder="123"
                        className="input-field pr-10"
                      />
                      <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-300" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-800/60">
                <Lock size={14} className="text-brand-500" />
                您的支付信息已加密保护，仅用于模拟演示
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              确认支付 ¥{totalPrice}
            </button>
          </div>
        )}

        {step === 3 && booking && (
          <div className="space-y-6">
            <div className="card p-8 text-center">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <Check size={40} className="text-success animate-bounce" />
              </div>
              <h2 className="section-title mb-2 text-2xl">预订成功！</h2>
              <p className="text-brand-800/60">您的预订已确认</p>

              <div className="mt-6 space-y-3 rounded-xl bg-surface-50 p-5 text-left">
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
                  <span className="text-brand-800/60">入住日期</span>
                  <span className="font-medium text-brand-800">{booking.checkIn}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-brand-800/60">退房日期</span>
                  <span className="font-medium text-brand-800">{booking.checkOut}</span>
                </div>
                {booking.checkInInstructions && (
                  <div className="border-t border-surface-200 pt-3">
                    <span className="text-sm text-brand-800/60">入住说明</span>
                    <p className="mt-1 text-sm text-brand-800">{booking.checkInInstructions}</p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-brand-800/60">
                <Mail size={16} className="text-brand-500" />
                确认邮件已发送至您的邮箱
              </div>
            </div>

            <Link
              to="/guest/bookings"
              className="btn-primary flex w-full items-center justify-center gap-2"
            >
              查看我的预订
              <ArrowRight size={18} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
