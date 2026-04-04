import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser } from '../../firebase/firestore';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import TopBar from '../../components/TopBar';
import InfoTooltip from '../../components/InfoTooltip';
import VPLevelBadge from '../../components/VPLevelBadge';
import { SERVICE_CATEGORIES } from '../../utils/vpSystem';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function ServiceMarketplaceScreen() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let q;
        if (activeCategory === 'all') {
          q = query(collection(db, 'services'), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(30));
        } else {
          q = query(collection(db, 'services'), where('status', '==', 'active'), where('category', '==', activeCategory), orderBy('createdAt', 'desc'), limit(30));
        }
        const snap = await getDocs(q);
        const items = await Promise.all(snap.docs.map(async d => {
          const data = { id: d.id, ...d.data() };
          data.seller = await getUser(data.sellerId).catch(() => null);
          return data;
        }));
        setServices(items);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [activeCategory]);

  const filtered = search.trim()
    ? services.filter(s => s.title?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()))
    : services;

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <TopBar title="Services" showBack />

      <div className="mx-4 mt-2">
        <InfoTooltip id="services_intro" icon="work" color="#7B6FFF" title="Earn real money on VERGR">
          Offer your skills — coaching, editing, design, moderation. Buyers pay with coins, you receive gems (cashable). Your VP level determines your rate: Rookie keeps 70%, Mythic keeps 85%.
        </InfoTooltip>
      </div>

      {/* Search + Create */}
      <div className="px-4 flex gap-2">
        <div className="flex-1 relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-2.5 pl-9 pr-3 text-sm text-text-primary focus:border-brand-cyan outline-none" />
        </div>
        <button onClick={() => navigate('/services/create')}
          className="px-4 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold shrink-0 flex items-center gap-1.5">
          <Icon name="add" size={18} /> Offer
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto no-scrollbar pb-1">
        <button onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === 'all' ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'}`}>
          All
        </button>
        {SERVICE_CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary'}`}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="work" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-secondary text-sm">{services.length === 0 ? 'No services listed yet' : 'No matches'}</p>
            <button onClick={() => navigate('/services/create')} className="mt-4 px-5 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold">
              List Your Service
            </button>
          </div>
        ) : (
          filtered.map(service => {
            const cat = SERVICE_CATEGORIES.find(c => c.id === service.category);
            return (
              <button key={service.id} onClick={() => navigate(`/services/${service.id}`)}
                className="w-full p-4 rounded-2xl bg-surface-1 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left group">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-2 flex items-center justify-center shrink-0">
                    <Icon name={cat?.icon || 'work'} size={20} className="text-brand-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-sm font-bold truncate group-hover:text-white">{service.title}</p>
                    <p className="text-text-muted text-xs line-clamp-2 mt-0.5">{service.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center gap-1.5">
                        <UserAvatar src={service.seller?.avatar} size={18} />
                        <span className="text-text-secondary text-[10px] font-dmmono">@{service.seller?.username || 'user'}</span>
                      </div>
                      {service.deliveryDays && (
                        <span className="text-text-muted text-[10px] flex items-center gap-0.5"><Icon name="schedule" size={10} /> {service.deliveryDays}d</span>
                      )}
                      {service.completedCount > 0 && (
                        <span className="text-text-muted text-[10px]">{service.completedCount} completed</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-brand-gold font-bold text-sm font-dmmono">{service.priceCoins}</p>
                    <p className="text-text-muted text-[9px] font-dmmono">€{(service.priceCoins * 0.01).toFixed(2)}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
