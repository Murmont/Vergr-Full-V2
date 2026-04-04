import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadPinnedScreen() {
  const { squadId } = useParams();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!squadId) return;
    const load = async () => {
      try {
        const q = query(collection(db, 'squads', squadId, 'announcements'), where('pinned', '==', true), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const anns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        for (const a of anns) { a.author = await getUser(a.authorId); }
        setItems(anns);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [squadId]);

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Pinned Messages</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Pinned Messages</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>
        : items.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="push_pin" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No pinned messages</p>
            <p className="text-text-muted/60 text-xs mt-1">Important announcements can be pinned by leaders</p>
          </div>
        ) : <div className="space-y-3">{items.map(item => (
          <div key={item.id} className="p-4 rounded-2xl bg-surface-1 border border-brand-gold/20">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="push_pin" filled size={14} className="text-brand-gold" />
              <span className="text-xs font-semibold">{item.author?.displayName || 'Leader'}</span>
            </div>
            <p className="text-sm text-text-primary">{item.content}</p>
          </div>
        ))}</div>}
      </div>
    </div>
  );
}