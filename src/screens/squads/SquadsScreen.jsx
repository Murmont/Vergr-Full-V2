import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import SquadsList from '../../components/SquadsList';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function SquadsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [activeTab, setActiveTab] = useState('My Squads');
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = activeTab === 'My Squads'
      ? query(collection(db, 'squads'), where('memberIds', 'array-contains', auth.currentUser.uid))
      : query(collection(db, 'squads'), where('isPublic', '==', true));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSquads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-bg-dark">
      <header className="sticky top-0 z-40 glass-header px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-syne text-lg font-bold text-text-primary">Squads</h1>
          <button 
            onClick={() => navigate('/squads/create')}
            className="w-9 h-9 rounded-full bg-brand-cyan text-bg-dark flex items-center justify-center hover:brightness-110 transition-colors"
          >
            <Icon name="add" size={22} />
          </button>
        </div>
        <div className="flex gap-4">
          {['My Squads', 'Discover'].map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm font-semibold transition-colors relative ${
                activeTab === tab ? 'text-text-primary' : 'text-text-muted'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <motion.div
                  layoutId="squadsTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand-cyan rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin mb-4" />
            <p className="text-text-muted text-[10px] font-dmmono">Loading squads</p>
          </div>
        ) : squads.length > 0 ? (
          <SquadsList squads={squads} onSquadClick={(id) => navigate(`/squads/${id}/chat`)} />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-surface-2 border border-white/[0.06] flex items-center justify-center mb-6">
              <Icon name="groups" size={40} className="text-brand-cyan" />
            </div>
            <h2 className="text-lg font-syne font-bold text-text-primary mb-2">No squads yet</h2>
            <p className="text-text-muted text-sm max-w-[240px] mb-8">
              {activeTab === 'My Squads'
                ? "You aren't part of a squad yet. Assemble your team or discover active communities."
                : "No public squads found. Be the first to create one!"}
            </p>
            <div className="flex flex-col w-full gap-3 max-w-xs">
              {activeTab === 'My Squads' && (
                <button 
                  onClick={() => setActiveTab('Discover')}
                  className="w-full py-4 rounded-2xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 transition-all shadow-sm shadow-black/10"
                >
                  Discover Squads
                </button>
              )}
              <button 
                onClick={() => navigate('/squads/create')}
                className="w-full py-4 rounded-2xl bg-surface-2 text-white border border-white/[0.06] font-bold text-sm hover:bg-surface-3 transition-all"
              >
                Create New Squad
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}