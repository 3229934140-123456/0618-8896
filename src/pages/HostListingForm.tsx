import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save } from 'lucide-react';
import { api } from '@/api';
import type { Listing } from '@/types';

const AMENITY_OPTIONS = ['WiFi', '厨房', '空调', '洗衣机', '停车位', '电梯', '电视', '热水器'];

export default function HostListingForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [imagesText, setImagesText] = useState('');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [rulesText, setRulesText] = useState('');
  const [maxGuests, setMaxGuests] = useState(1);
  const [bedrooms, setBedrooms] = useState(1);
  const [bathrooms, setBathrooms] = useState(1);
  const [basePrice, setBasePrice] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    setLoading(true);
    api.listings.getById(id).then((res) => {
      if (res.success) {
        const l = res.data;
        setTitle(l.title);
        setDescription(l.description);
        setCity(l.city);
        setAddress(l.address);
        setImagesText((l.images || []).join(', '));
        setAmenities(l.amenities || []);
        setRulesText((l.rules || []).join('\n'));
        setMaxGuests(l.maxGuests);
        setBedrooms(l.bedrooms);
        setBathrooms(l.bathrooms);
        setBasePrice(l.basePrice);
      }
    }).finally(() => setLoading(false));
  }, [id, isEditing]);

  const toggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const images = imagesText.split(',').map((s) => s.trim()).filter(Boolean);
    const rules = rulesText.split('\n').map((s) => s.trim()).filter(Boolean);

    const data: Partial<Listing> = {
      title,
      description,
      city,
      address,
      images,
      amenities,
      rules,
      maxGuests,
      bedrooms,
      bathrooms,
      basePrice,
    };

    try {
      if (isEditing) {
        await api.listings.update(id, data);
      } else {
        await api.listings.create(data);
      }
      navigate('/host/listings');
    } catch {
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
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
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="section-title mb-6">{isEditing ? '编辑房源' : '添加房源'}</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-800">房源标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-800">房源描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="input-field resize-none"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">城市</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">详细地址</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-800">图片链接（逗号分隔）</label>
            <input
              type="text"
              value={imagesText}
              onChange={(e) => setImagesText(e.target.value)}
              placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg"
              className="input-field"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-brand-800">设施与服务</label>
            <div className="flex flex-wrap gap-3">
              {AMENITY_OPTIONS.map((amenity) => (
                <label
                  key={amenity}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${
                    amenities.includes(amenity)
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-brand-800/70 hover:border-surface-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => toggleAmenity(amenity)}
                    className="sr-only"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-800">房屋守则（每行一条）</label>
            <textarea
              value={rulesText}
              onChange={(e) => setRulesText(e.target.value)}
              rows={3}
              placeholder="禁止吸烟&#10;禁止宠物&#10;请保持安静"
              className="input-field resize-none"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">最大房客数</label>
              <input
                type="number"
                value={maxGuests}
                onChange={(e) => setMaxGuests(Number(e.target.value))}
                min={1}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">卧室数</label>
              <input
                type="number"
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                min={1}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">浴室数</label>
              <input
                type="number"
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                min={1}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brand-800">基础价格（¥/晚）</label>
              <input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(Number(e.target.value))}
                min={1}
                className="input-field"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} />
            {submitting ? '保存中...' : '保存'}
          </button>
        </form>
      </div>
    </div>
  );
}
