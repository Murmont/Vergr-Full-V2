import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { createConversation } from '../../firebase/firestore';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import { getTier } from '../../utils/helpers';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function NewMessageScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncing, setDebouncing] = useState(false);
  
  const navigate = useNavigate();
  const { profile } = useUser();
  const { showToast } = useUI();

  // Search logic with debounce
  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setDebouncing(false);
      try {
        const q = query(
          collection(db, 'users'),
          where('username', '>=', search.toLowerCase()),
          where('username', '<=', search.toLowerCase() + '\uf8ff'),
          limit(10)
        );
        
        const snap = await getDocs(q);
        const users = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.uid !== auth.currentUser?.uid);
          
        setResults(users);
      } catch (err) {
        console.error("Search error:", err);
        showToast("Failed to search users", "error");
      } finally {
        setLoading(false);
      }
    }, 500);

    setDebouncing(true);
    return () => clearTimeout(timer);
  }, [search, showToast]);

  const startConversation = async (targetUser) => {
    try {
      setLoading(true);
      // Calls the centralized function from firestore.js
      const convoId = await createConversation(
        auth.currentUser.uid, 
        { id: targetUser.uid, ...targetUser }, 
        null
      );
      navigate(`/messages/${convoId}`);
    } catch (err) {
      console.error("Error starting conversation:", err);
      showToast("Could not start conversation", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={isDesktop ? "min-h-screen bg-bg-dark flex flex-col" : "screen-container min-h-screen bg-bg-dark flex flex-col"}>
      {/* Header */}
      <header className="flex items-center gap-4 px-5 pt-12 pb-4 border-b border-white/[0.03]">
        <button 
          onClick={() => navigate(-1)} 
          className="text-white hover:text-brand-cyan transition-colors"
        >
          <Icon name="arrow_back" size={24} />
        </button>
        <h1 className="text-xl font-syne font-black text-white uppercase italic tracking-tighter">
          New Transmission
        </h1>
      </header>

      {/* Search Bar */}
      <div className="px-5 pt-6 mb-6">
        <div className="flex items-center bg-surface-2 rounded-2xl px-4 py-1 border border-white/[0.06] focus-within:border-brand-cyan transition-all">
          <Icon name="search" size={18} className="text-text-muted mr-3" />
          <input 
            autoFocus
            value={search} 
            onChange={e => {
              setSearch(e.target.value);
              setDebouncing(true);
            }} 
            className="flex-1 bg-transparent text-white py-3 text-sm outline-none placeholder:text-text-muted" 
            placeholder="Search by username..." 
          />
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-cyan"></div>
          )}
        </div>
      </div>

      {/* Results List */}
      <main className="flex-1 px-5 space-y-2 pb-10">
        {loading || debouncing ? (
          <div className="py-10 text-center animate-pulse text-brand-cyan text-[10px] font-bold uppercase tracking-[0.3em]">
            Scanning Network...
          </div>
        ) : search.length >= 2 && results.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-sm italic">
            No pilots found matching "{search}"
          </div>
        ) : (
          results.map(u => {
            const tier = getTier(u.coinsSpent || 0);
            return (
              <button 
                key={u.uid} 
                onClick={() => startConversation(u)} 
                className="flex items-center gap-4 w-full p-3 rounded-2xl hover:bg-surface-1 transition-all group"
              >
                <UserAvatar src={u.avatar} size={48} tier={tier} />
                <div className="flex-1 text-left">
                  <p className={`font-bold text-sm ${tier.holographic ? 'text-brand-cyan' : 'text-white'}`}>
                    {u.displayName || u.username}
                  </p>
                  <p className="text-text-muted text-xs font-dmmono">@{u.username}</p>
                </div>
                <Icon 
                  name="add_circle" 
                  size={20} 
                  className="text-brand-cyan opacity-0 group-hover:opacity-100 transition-opacity" 
                />
              </button>
            );
          })
        )}
      </main>
    </div>
  );
}