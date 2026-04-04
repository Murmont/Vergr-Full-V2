import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchUsers } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function CoStreamingScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [invited, setInvited] = useState([]);

  const handleSearch = async (term) => {
    setSearch(term);
    if (term.length < 2) { setResults([]); return; }
    const users = await searchUsers(term, 5);
    setResults(users);
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Co-Stream Setup" showBack />
      <div className="px-4 py-4">
        <p className="text-text-muted text-sm mb-4">Invite creators to co-stream with you.</p>
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search creators..."
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none mb-4" />
        
        {invited.length > 0 && (
          <div className="mb-4">
            <p className="text-text-muted text-xs font-bold uppercase mb-2">Invited ({invited.length}/3)</p>
            <div className="flex gap-2">
              {invited.map(u => (
                <div key={u.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20">
                  <span className="text-xs font-semibold text-brand-cyan">@{u.username}</span>
                  <button onClick={() => setInvited(prev => prev.filter(x => x.id !== u.id))}><Icon name="close" size={14} className="text-text-muted" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {results.filter(u => !invited.find(i => i.id === u.id)).map(user => (
            <button key={user.id} onClick={() => invited.length < 3 && setInvited(prev => [...prev, user])}
              className="flex items-center gap-3 w-full p-3 rounded-2xl bg-surface-1 border border-white/[0.06] text-left">
              <UserAvatar src={user.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-text-muted">@{user.username}</p>
              </div>
              <Icon name="add_circle" size={22} className="text-brand-cyan" />
            </button>
          ))}
        </div>

        <button disabled={invited.length === 0} onClick={() => navigate('/go-live')}
          className={`w-full py-4 rounded-2xl font-bold mt-6 ${invited.length > 0 ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'}`}>
          Start Co-Stream
        </button>
      </div>
    </div>
  );
}
