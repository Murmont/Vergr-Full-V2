import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import { useUI } from '../../context/UIContext';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function CreateGroupChatScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const navigate = useNavigate();
  const { showToast } = useUI();
  const [name, setName] = useState('');
  const [selected, setSelected] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'));
        setFriends(snap.docs.map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => u.uid !== auth.currentUser.uid));
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    fetchFriends();
  }, []);

  const toggleSelection = (user) => {
    setSelected(prev => 
      prev.find(u => u.uid === user.uid) 
        ? prev.filter(u => u.uid !== user.uid) 
        : [...prev, user]
    );
  };

  const createGroup = async () => {
    if (!name.trim() || selected.length < 2) {
      showToast('Name and at least 2 members required', 'error');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        isGroup: true,
        groupName: name,
        participants: [auth.currentUser.uid, ...selected.map(u => u.uid)],
        createdBy: auth.currentUser.uid,
        lastMessageText: `${auth.currentUser.displayName} created the group`,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        metadata: {
            [auth.currentUser.uid]: { name: auth.currentUser.displayName, avatar: auth.currentUser.photoURL }
        }
      });
      navigate(`/messages/${docRef.id}`);
    } catch (err) {
      showToast('Failed to create group', 'error');
    }
  };

  return (
    <div className={isDesktop ? "min-h-screen flex flex-col bg-bg-dark" : "screen-container min-h-screen flex flex-col bg-bg-dark"}>
      <header className="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-white/[0.04]">
        <button onClick={() => navigate(-1)} className="text-white/80"><Icon name="arrow_back" size={24}/></button>
        <h1 className="text-white font-syne font-bold text-lg flex-1">New Group</h1>
        <button onClick={createGroup} className="text-brand-cyan text-sm font-bold">Create</button>
      </header>

      <div className="p-5 space-y-6">
        <div>
          <label className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2 block">Group Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-white outline-none focus:border-brand-cyan transition-colors" 
            placeholder="Enter group name..." 
          />
        </div>
        
        <div>
          <p className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-3">Add Members ({selected.length})</p>
          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
            {friends.map(f => {
              const isSelected = selected.find(u => u.uid === f.uid);
              return (
                <button key={f.uid} onClick={() => toggleSelection(f)} className="flex items-center gap-3 w-full py-3 px-3 rounded-xl hover:bg-surface-1 transition-colors">
                  <UserAvatar src={f.avatar} size={40} />
                  <div className="flex-1 text-left">
                    <p className="text-text-primary font-bold text-sm">{f.displayName}</p>
                    <p className="text-text-muted text-xs">@{f.username}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-brand-cyan border-brand-cyan scale-110' : 'border-white/[0.06]'
                  }`}>
                    {isSelected && <Icon name="check" size={14} className="text-bg-dark font-bold" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}