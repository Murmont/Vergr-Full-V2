import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';
import TopBar from '../../components/TopBar';
import { SERVICE_CATEGORIES, getGemRate, getVPLevel } from '../../utils/vpSystem';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function CreateServiceScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceCoins, setPriceCoins] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  const vp = wallet?.vp || 0;
  const level = getVPLevel(vp);
  const gemRate = getGemRate(vp);
  const price = parseInt(priceCoins) || 0;
  const sellerGems = Math.round(price * gemRate);

  const isValid = title.trim().length >= 3 && description.trim().length >= 10 && category && price >= 50 && parseInt(deliveryDays) >= 1;

  const handleSubmit = async () => {
    if (!isValid || submitting || !currentUser) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'services'), {
        sellerId: currentUser.uid,
        title: title.trim(),
        description: description.trim(),
        category,
        priceCoins: price,
        sellerCommission: level.commission,
        deliveryDays: parseInt(deliveryDays),
        status: 'active',
        completedCount: 0,
        rating: 0,
        ratingCount: 0,
        createdAt: serverTimestamp(),
      });
      showToast('Service listed!', 'success');
      navigate('/services');
    } catch (err) {
      console.error(err);
      showToast('Failed to create listing', 'error');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <TopBar title="List a Service" showBack />

      <div className={`px-4 py-4 space-y-4 ${isDesktop ? 'max-w-lg' : ''}`}>
        {/* Earnings preview */}
        <div className="p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/20">
          <p className="text-text-secondary text-[10px] uppercase font-bold tracking-wider mb-2">Your earnings preview</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-brand-gold text-lg font-bold font-dmmono">{price || '—'} <span className="text-text-muted text-xs">buyer pays</span></p>
              <p className="text-brand-cyan text-lg font-bold font-dmmono">◆ {price ? sellerGems : '—'} <span className="text-text-muted text-xs">you receive</span></p>
            </div>
            <div className="text-right">
              <p className="text-text-muted text-[10px]">Your rate: {Math.round(gemRate * 100)}%</p>
              <p className="text-text-muted text-[10px]">Level: <span style={{ color: level.ringColor }}>{level.name}</span></p>
              <p className="text-text-muted text-[10px]">Platform: {Math.round(level.commission * 100)}%</p>
            </div>
          </div>
          {level.level < 7 && (
            <p className="text-[9px] text-text-muted mt-2 border-t border-white/[0.04] pt-2">Level up your VP to reduce commission. Next level saves you more on every sale.</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="text-text-secondary text-xs font-bold block mb-1.5">Service Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={80}
            placeholder="e.g. Apex Legends Ranked Coaching — Diamond to Masters"
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary focus:border-brand-cyan outline-none" />
        </div>

        {/* Category */}
        <div>
          <label className="text-text-secondary text-xs font-bold block mb-1.5">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-left text-xs transition-all ${
                  category === cat.id ? 'bg-brand-cyan/10 border-brand-cyan/40 text-brand-cyan font-bold' : 'bg-surface-2 border-white/[0.04] text-text-secondary'
                }`}>
                <Icon name={cat.icon} size={16} /> {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-text-secondary text-xs font-bold block mb-1.5">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000} rows={4}
            placeholder="Describe what you offer, your experience, and what the buyer gets..."
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary focus:border-brand-cyan outline-none resize-none" />
          <p className="text-text-muted text-[10px] mt-1 text-right">{description.length}/1000</p>
        </div>

        {/* Price + Delivery */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Price (coins)</label>
            <input type="number" value={priceCoins} onChange={e => setPriceCoins(e.target.value)} min={50}
              placeholder="Min 50"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary focus:border-brand-cyan outline-none" />
            {price > 0 && <p className="text-text-muted text-[10px] mt-1">= €{(price * 0.01).toFixed(2)} for buyer</p>}
          </div>
          <div className="w-28">
            <label className="text-text-secondary text-xs font-bold block mb-1.5">Delivery</label>
            <select value={deliveryDays} onChange={e => setDeliveryDays(e.target.value)}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-3 py-3 text-sm text-text-primary focus:border-brand-cyan outline-none">
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="5">5 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={!isValid || submitting}
          className="w-full py-3.5 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm disabled:opacity-40 transition-opacity">
          {submitting ? 'Publishing...' : 'Publish Service'}
        </button>
      </div>
    </div>
  );
}
