import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function TournamentStandingsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { tournamentId } = useParams();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const q = query(collection(db, 'tournaments', tournamentId || 'none', 'entries'), orderBy('wins', 'desc'));
        const snap = await getDocs(q);
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [tournamentId]);

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Standings" showBack />
      <div className="px-4 py-4">
        {loading ? <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>
        : entries.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="emoji_events" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No standings data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => (
              <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${i < 3 ? 'border-brand-gold/30 bg-brand-gold/5' : 'border-white/[0.06] bg-surface-1'}`}>
                <span className="w-8 text-center font-dmmono font-bold text-sm">{i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{entry.teamName || entry.userId}</p>
                  <p className="text-xs text-text-muted">{entry.wins||0}W - {entry.losses||0}L</p>
                </div>
                <span className="font-dmmono font-bold text-sm text-brand-gold">{entry.points || entry.wins*3 || 0} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
