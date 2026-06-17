import { Link } from 'react-router-dom';
import { Star, Heart, MapPin } from 'lucide-react';
import type { Listing } from '@/types';

export default function ListingCard({ listing }: { listing: Listing }) {
  const listingRaw = listing as unknown as Record<string, unknown>;
  const images: string[] = typeof listingRaw.images === 'string' ? JSON.parse(listingRaw.images as string) : (listing.images || []);
  const rating = listing.rating ?? 0;
  const reviewCount = listing.reviewCount ?? 0;
  const basePrice = listing.basePrice ?? 0;

  return (
    <Link to={`/listing/${listing.id}`} className="group block">
      <div className="card overflow-hidden">
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={images[0] || 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cozy%20apartment%20interior&image_size=landscape_16_9'}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <button
            onClick={(e) => { e.preventDefault(); }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-surface-300 hover:text-brand-500 transition-colors"
          >
            <Heart className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-brand-800 truncate">{listing.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-4 h-4 fill-brand-500 text-brand-500" />
              <span className="text-sm font-medium text-brand-800">{rating.toFixed(1)}</span>
              <span className="text-xs text-surface-300">({reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-surface-300" />
            <span className="text-sm text-surface-300">{listing.city}</span>
          </div>
          <div className="mt-3">
            <span className="text-lg font-bold text-brand-500">¥{basePrice}</span>
            <span className="text-sm text-surface-300"> /晚</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
