import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadChallengesScreen() {
  const { squadId } = useParams();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!squadId) return;
    getDocs(query(collection(db, 'squads', squadId, 'challenges'), orderBy('createdAt', 'desc'), limit(20)))
      .then(snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [squadId]);

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Challenges</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Challenges</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="emoji_events" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No challenges yet</p>
            <p className="text-text-muted/60 text-xs mt-1">Challenges are created by squad leadership to engage members</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <h3 className="text-sm font-bold">{item.title || 'Challenge'}</h3>
                {item.description && <p className="text-xs text-text-muted mt-1">{item.description}</p>}
                {item.reward && <p className="text-xs text-brand-gold font-dmmono mt-2">{item.reward} coins</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}