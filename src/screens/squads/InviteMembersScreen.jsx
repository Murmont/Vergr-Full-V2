import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { searchUsers, submitJoinRequest } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function InviteMembersScreen() {
  const { squadId } = useParams();
  const { showToast } = useUI();
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [invited, setInvited] = useState([]);

  const handleSearch = async (term) => {
    setSearch(term);
    if (term.length < 2) { setResults([]); return; }
    try {
      const users = await searchUsers(term, 10);
      setResults(users);
    } catch (err) { console.error(err); }
  };

  const handleInvite = (userId) => {
    setInvited(prev => [...prev, userId]);
    showToast('Invite sent!', 'success');
  };

  return (
    <div className="pb-8">
      {isMobile && <TopBar title="Invite Members" showBack />}
      <div className="px-4 py-4">
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)} placeholder="Search by username..."
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none mb-4" autoFocus />
        <div className="space-y-2">
          {results.map(user => (
            <div key={user.id} className="flex items-center gap-3 p-3 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <UserAvatar src={user.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.displayName || user.username}</p>
                <p className="text-xs text-text-muted">@{user.username}</p>
              </div>
              <button onClick={() => handleInvite(user.id)} disabled={invited.includes(user.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold ${invited.includes(user.id) ? 'bg-surface-3 text-text-muted' : 'bg-brand-cyan text-bg-dark'}`}>
                {invited.includes(user.id) ? 'Invited' : 'Invite'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}