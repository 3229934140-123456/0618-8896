import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Users, MapPin, ArrowRight } from 'lucide-react';
import { api } from '@/api';
import ListingCard from '@/components/ListingCard';
import type { Listing } from '@/types';

const CITIES = ['北京', '上海', '杭州', '成都', '三亚', '西安'];

export default function Home() {
  const navigate = useNavigate();
  const [city, setCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(1);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    api.listings.search({ limit: 6 }).then((res) => {
      if (res.success) setListings(res.data);
    });
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set('city', city);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests > 1) params.set('guests', String(guests));
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div>
      <section className="relative bg-gradient-to-r from-brand-500 to-brand-700 pb-20 pt-24">
        <div className="container mx-auto px-4 text-center">
          <h1 className="mb-4 font-display text-5xl font-bold text-white drop-shadow-lg md:text-6xl">
            发现你的理想住所
          </h1>
          <p className="mx-auto mb-12 max-w-xl text-lg text-white/85">
            在独特的民宿中体验当地生活
          </p>
        </div>

        <div className="absolute -bottom-12 left-0 right-0">
          <div className="container mx-auto px-4">
            <div className="mx-auto flex max-w-4xl flex-col items-stretch gap-3 rounded-2xl bg-white p-4 shadow-xl sm:flex-row sm:items-center sm:gap-4">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-200 px-4 py-3">
                <MapPin className="h-5 w-5 shrink-0 text-brand-400" />
                <input
                  type="text"
                  placeholder="搜索城市..."
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-200 px-4 py-3">
                <Calendar className="h-5 w-5 shrink-0 text-brand-400" />
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-200 px-4 py-3">
                <Calendar className="h-5 w-5 shrink-0 text-brand-400" />
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-200 px-4 py-3">
                <Users className="h-5 w-5 shrink-0 text-brand-400" />
                <select
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full bg-transparent text-sm outline-none"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} 位房客</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 font-medium text-white transition-colors hover:bg-brand-600 active:scale-95"
              >
                <Search className="h-5 w-5" />
                搜索
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 pt-24">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="section-title">热门目的地</h2>
            <button className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600">
              查看更多 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4">
            {CITIES.map((name) => (
              <button
                key={name}
                onClick={() => navigate(`/search?city=${encodeURIComponent(name)}`)}
                className="group relative h-52 w-44 shrink-0 overflow-hidden rounded-2xl"
              >
                <img
                  src={`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20cityscape%20of%20${encodeURIComponent(name)}%20China&image_size=landscape_16_9`}
                  alt={name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 font-display text-xl font-bold text-white">
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="section-title">精选房源</h2>
            <button
              onClick={() => navigate('/search')}
              className="flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-600"
            >
              查看全部 <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {listings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-surface-300">
              暂无精选房源
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
