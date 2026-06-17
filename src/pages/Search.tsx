import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { api } from '@/api';
import ListingCard from '@/components/ListingCard';
import type { Listing, SearchParams } from '@/types';

const AMENITIES = ['WiFi', '厨房', '空调', '洗衣机', '停车位', '电梯'];

const CITIES = ['北京', '上海', '杭州', '成都', '三亚', '西安', '厦门', '丽江'];

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-48 bg-surface-100" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-20 rounded bg-surface-100" />
        <div className="h-5 w-3/4 rounded bg-surface-100" />
        <div className="h-4 w-1/2 rounded bg-surface-100" />
        <div className="flex justify-between">
          <div className="h-6 w-24 rounded bg-surface-100" />
          <div className="h-4 w-16 rounded bg-surface-100" />
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [city, setCity] = useState(searchParams.get('city') || '');
  const [checkIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut] = useState(searchParams.get('checkOut') || '');
  const [guests] = useState(Number(searchParams.get('guests')) || undefined);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params: SearchParams = {};
      if (city) params.city = city;
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      if (guests) params.guests = guests;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);
      const res = await api.listings.search(params);
      if (res.success) {
        let filtered = res.data;
        if (bedrooms) {
          filtered = filtered.filter((l) => l.bedrooms >= Number(bedrooms));
        }
        if (selectedAmenities.length > 0) {
          filtered = filtered.filter((l) =>
            selectedAmenities.every((a) => l.amenities?.includes(a))
          );
        }
        setListings(filtered);
        setTotal(filtered.length);
      }
    } finally {
      setLoading(false);
    }
  }, [city, checkIn, checkOut, guests, minPrice, maxPrice, bedrooms, selectedAmenities]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const clearFilters = () => {
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setBedrooms('');
    setSelectedAmenities([]);
  };

  const hasActiveFilters = city || minPrice || maxPrice || bedrooms || selectedAmenities.length > 0;

  const filterPanel = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-brand-800">筛选条件</h3>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-sm text-brand-500 hover:text-brand-600">
            清除全部
          </button>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">城市</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="input-field"
        >
          <option value="">全部城市</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">价格范围 (¥/晚)</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="最低价"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="input-field"
          />
          <span className="text-surface-300">–</span>
          <input
            type="number"
            placeholder="最高价"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">卧室数量</label>
        <select
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
          className="input-field"
        >
          <option value="">不限</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}间及以上</option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-brand-800">设施</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              onClick={() => toggleAmenity(amenity)}
              className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                selectedAmenities.includes(amenity)
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-surface-200 bg-white text-brand-800 hover:border-brand-300'
              }`}
            >
              {amenity}
            </button>
          ))}
        </div>
      </div>

      <button onClick={fetchListings} className="btn-primary w-full">
        应用筛选
      </button>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="section-title">搜索房源</h1>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 rounded-xl border border-surface-200 px-4 py-2 text-sm font-medium text-brand-800 hover:bg-surface-50 lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {showFilters ? '隐藏筛选' : '显示筛选'}
        </button>
      </div>

      <div className="flex gap-8">
        <aside
          className={`${
            showFilters ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto lg:static lg:z-auto lg:bg-transparent lg:p-0' : 'hidden'
          } lg:block lg:w-72 lg:shrink-0`}
        >
          <div className="flex items-center justify-between lg:hidden">
            <h2 className="text-lg font-bold text-brand-800">筛选</h2>
            <button onClick={() => setShowFilters(false)}>
              <X className="h-6 w-6 text-brand-800" />
            </button>
          </div>
          {filterPanel}
        </aside>

        <main className="min-w-0 flex-1">
          {!loading && (
            <p className="mb-6 text-sm text-surface-300">
              找到 <span className="font-semibold text-brand-800">{total}</span> 个房源
            </p>
          )}

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : listings.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-surface-300">
              <SlidersHorizontal className="mb-4 h-12 w-12" />
              <p className="text-lg font-medium">未找到符合条件的房源</p>
              <p className="mt-1 text-sm">请尝试调整筛选条件</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
