// src/screens/messages/ChatDetailScreen.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, where, getDocs, updateDoc, writeBatch, limit } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import TopBar from '../../components/TopBar';
import useResponsive from '../../hooks/useResponsive';
import useOnlineStatus from '../../hooks/useOnlineStatus';

const MEDIA_TABS = [
  { id: 'photos', label: 'Photos', icon: 'photo' },
  { id: 'videos', label: 'Videos', icon: 'videocam' },
  { id: 'files', label: 'Files', icon: 'description' },
  { id: 'links', label: 'Links', icon: 'link' },
  { id: 'voice', label: 'Voice', icon: 'mic' },
];

export default function ChatDetailScreen() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const [chatInfo, setChatInfo] = useState(null);
  const [otherProfile, setOtherProfile] = useState(null);
  const [mediaTab, setMediaTab] = useState('photos');
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState(null);

  const otherUserId = chatInfo?.participants?.find(id => id !== auth.currentUser?.uid);
  const { isOnline, lastSeen } = useOnlineStatus(otherUserId);

  // Load conversation
  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, 'conversations', chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setChatInfo(data);
        setMuted(!!data.muted);
      }
    });
    return () => unsub();
  }, [chatId]);

  // Load other user's full profile
  useEffect(() => {
    if (!otherUserId) return;
    const unsub = onSnapshot(doc(db, 'users', otherUserId), (snap) => {
      if (snap.exists()) setOtherProfile({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [otherUserId]);

  // Load shared media based on tab
  useEffect(() => {
    if (!chatId) return;
    setMediaLoading(true);
    setMediaItems([]);

    const typeMap = {
      photos: ['image'],
      videos: ['video', 'clip'],
      files: ['file', 'audio'],
      links: ['text'],
      voice: ['voice'],
    };
    const types = typeMap[mediaTab] || [];

    const loadMedia = async () => {
      try {
        const msgsRef = collection(db, 'conversations', chatId, 'messages');
        let q;
        if (mediaTab === 'links') {
          // For links, get text messages and filter client-side for URLs
          q = query(msgsRef, orderBy('createdAt', 'desc'), limit(200));
        } else {
          q = query(msgsRef, where('type', 'in', types), orderBy('createdAt', 'desc'), limit(100));
        }
        const snap = await getDocs(q);
        let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (mediaTab === 'links') {
          const urlRegex = /https?:\/\/[^\s<]+/gi;
          items = items.filter(m => m.text && urlRegex.test(m.text)).map(m => {
            const urls = m.text.match(urlRegex);
            return { ...m, extractedUrl: urls?.[0] };
          });
        }

        setMediaItems(items);
      } catch (err) {
        console.error('Load media error:', err);
      }
      setMediaLoading(false);
    };
    loadMedia();
  }, [chatId, mediaTab]);

  const handleMuteToggle = async () => {
    try {
      await updateDoc(doc(db, 'conversations', chatId), { muted: !muted });
      setMuted(!muted);
      showToast(muted ? 'Notifications unmuted' : 'Notifications muted');
    } catch (err) { console.error('Mute toggle error:', err); }
  };

  const handleClearChat = async () => {
    if (!window.confirm('Clear all messages? This cannot be undone.')) return;
    try {
      const snap = await getDocs(collection(db, 'conversations', chatId, 'messages'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      showToast('Chat cleared');
    } catch (err) { console.error('Clear chat error:', err); }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm('Delete this chat permanently?')) return;
    try {
      await updateDoc(doc(db, 'conversations', chatId), { status: 'deleted' });
      navigate('/messages');
    } catch (err) { console.error('Delete chat error:', err); }
  };

  const handleBlockUser = async () => {
    if (!otherUserId || !window.confirm(`Block ${otherProfile?.displayName || 'this user'}?`)) return;
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'users', auth.currentUser.uid, 'blocked', otherUserId), {
        blockedAt: new Date(),
        userId: otherUserId,
      });
      showToast('User blocked');
    } catch (err) { console.error('Block error:', err); }
  };

  const formatLastSeen = () => {
    if (isOnline) return 'online';
    if (lastSeen) {
      const diff = Date.now() - lastSeen;
      if (diff < 60000) return 'last seen just now';
      if (diff < 3600000) return `last seen ${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `last seen ${Math.floor(diff / 3600000)}h ago`;
      return `last seen ${lastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return 'offline';
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const otherMeta = chatInfo?.metadata?.[otherUserId];
  const displayName = otherProfile?.displayName || otherMeta?.name || 'User';
  const username = otherProfile?.username;
  const bio = otherProfile?.bio;
  const avatar = otherProfile?.avatar || otherMeta?.avatar;
  const memberSince = otherProfile?.createdAt?.toDate?.();

  return (
    <div className="flex flex-col h-full bg-bg-dark">
      {isMobile && <TopBar title="Chat Details" showBack />}
      {!isMobile && (
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-white/[0.04]">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white"><Icon name="arrow_back" size={24} /></button>
          <h1 className="text-lg font-bold text-white">Chat Details</h1>
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Profile header */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="relative mb-4">
            <UserAvatar src={avatar} size={80} />
            {isOnline && <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-bg-dark rounded-full" />}
          </div>
          <h2 className="text-white font-bold text-xl">{displayName}</h2>
          {username && <p className="text-text-muted text-sm mt-0.5">@{username}</p>}
          <p className={`text-xs mt-1 font-medium ${isOnline ? 'text-green-400' : 'text-text-muted'}`}>{formatLastSeen()}</p>
          {bio && <p className="text-text-secondary text-sm text-center mt-3 max-w-xs leading-relaxed">{bio}</p>}
        </div>

        {/* Quick actions */}
        <div className="flex justify-center gap-4 pb-6">
          <button onClick={() => navigate(`/messages/${chatId}`)} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center"><Icon name="chat" size={22} className="text-brand-cyan" /></div>
            <span className="text-[10px] text-text-muted font-bold">Message</span>
          </button>
          <button onClick={() => navigate(`/call/${chatId}/voice`)} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center"><Icon name="call" size={22} className="text-brand-cyan" /></div>
            <span className="text-[10px] text-text-muted font-bold">Call</span>
          </button>
          <button onClick={() => navigate(`/call/${chatId}/video`)} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center"><Icon name="videocam" size={22} className="text-brand-cyan" /></div>
            <span className="text-[10px] text-text-muted font-bold">Video</span>
          </button>
          <button onClick={() => navigate(`/user/${otherUserId}`)} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-brand-cyan/10 flex items-center justify-center"><Icon name="person" size={22} className="text-brand-cyan" /></div>
            <span className="text-[10px] text-text-muted font-bold">Profile</span>
          </button>
        </div>

        {/* Info section */}
        {(otherProfile?.email || memberSince) && (
          <div className="mx-4 mb-4">
            <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
              {otherProfile?.email && (
                <div className="flex items-center gap-3 px-4 py-3">
                  <Icon name="email" size={20} className="text-text-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{otherProfile.email}</p>
                    <p className="text-[10px] text-text-muted">Email</p>
                  </div>
                </div>
              )}
              {memberSince && (
                <div className={`flex items-center gap-3 px-4 py-3 ${otherProfile?.email ? 'border-t border-white/[0.03]' : ''}`}>
                  <Icon name="calendar_today" size={20} className="text-text-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{memberSince.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    <p className="text-[10px] text-text-muted">Member since</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="mx-4 mb-4">
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Settings</h3>
          <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <button onClick={handleMuteToggle} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left">
              <Icon name={muted ? 'notifications_off' : 'notifications'} size={20} className="text-text-secondary" />
              <span className="flex-1 text-sm text-text-primary">{muted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
              <div className={`w-10 h-6 rounded-full flex items-center px-0.5 transition-colors ${muted ? 'bg-brand-cyan justify-end' : 'bg-surface-3 justify-start'}`}>
                <div className="w-5 h-5 bg-white rounded-full shadow" />
              </div>
            </button>
            <button onClick={() => navigate(`/messages/${chatId}/settings`)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left border-t border-white/[0.03]">
              <Icon name="wallpaper" size={20} className="text-text-secondary" />
              <span className="flex-1 text-sm text-text-primary">Change Wallpaper</span>
              <Icon name="chevron_right" size={18} className="text-text-muted" />
            </button>
          </div>
        </div>

        {/* Shared media */}
        <div className="mx-4 mb-4">
          <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-2 px-1">Shared Media</h3>
          <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            {/* Media tabs */}
            <div className="flex overflow-x-auto no-scrollbar border-b border-white/[0.03]">
              {MEDIA_TABS.map(t => (
                <button key={t.id} onClick={() => setMediaTab(t.id)}
                  className={`flex-1 min-w-0 py-2.5 flex flex-col items-center gap-0.5 transition-colors relative ${mediaTab === t.id ? 'text-brand-cyan' : 'text-text-muted hover:text-text-secondary'}`}>
                  <Icon name={t.icon} size={18} />
                  <span className="text-[8px] font-bold uppercase tracking-wider">{t.label}</span>
                  {mediaTab === t.id && <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-brand-cyan rounded-full" />}
                </button>
              ))}
            </div>

            {/* Media grid */}
            <div className="p-2 min-h-[120px]">
              {mediaLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!mediaLoading && mediaItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Icon name={MEDIA_TABS.find(t => t.id === mediaTab)?.icon || 'photo'} size={28} className="text-text-muted/20 mb-2" />
                  <p className="text-xs text-text-muted">No {mediaTab} shared yet</p>
                </div>
              )}

              {!mediaLoading && mediaItems.length > 0 && (
                <>
                  {(mediaTab === 'photos') && (
                    <div className="grid grid-cols-3 gap-1">
                      {mediaItems.map(m => (
                        <a key={m.id} href={m.contentUrl} target="_blank" rel="noopener noreferrer" className="aspect-square overflow-hidden rounded-lg">
                          <img src={m.contentUrl} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" loading="lazy" />
                        </a>
                      ))}
                    </div>
                  )}

                  {(mediaTab === 'videos') && (
                    <div className="grid grid-cols-3 gap-1">
                      {mediaItems.map(m => (
                        <div key={m.id} className="aspect-square overflow-hidden rounded-lg relative group">
                          <video src={m.contentUrl} className="w-full h-full object-cover" preload="metadata" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <Icon name="play_circle" size={32} className="text-white/80" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(mediaTab === 'files') && (
                    <div className="space-y-1">
                      {mediaItems.map(m => (
                        <a key={m.id} href={m.contentUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-brand-cyan/10 flex items-center justify-center shrink-0">
                            <Icon name="description" size={18} className="text-brand-cyan" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary truncate">{m.fileName || 'File'}</p>
                            <p className="text-[10px] text-text-muted">{m.fileSize ? (m.fileSize < 1048576 ? `${(m.fileSize / 1024).toFixed(1)} KB` : `${(m.fileSize / 1048576).toFixed(1)} MB`) : ''}</p>
                          </div>
                          <Icon name="download" size={16} className="text-text-muted" />
                        </a>
                      ))}
                    </div>
                  )}

                  {(mediaTab === 'links') && (
                    <div className="space-y-1">
                      {mediaItems.map(m => (
                        <a key={m.id} href={m.extractedUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                            <Icon name="link" size={18} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-brand-cyan truncate">{m.extractedUrl}</p>
                            <p className="text-[10px] text-text-muted truncate">{m.text}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}

                  {(mediaTab === 'voice') && (
                    <div className="space-y-1">
                      {mediaItems.map(m => (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-2 transition-colors">
                          <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                            <Icon name="mic" size={18} className="text-green-400" />
                          </div>
                          <audio src={m.contentUrl} controls className="flex-1 h-8" />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="mx-4 mb-8">
          <div className="rounded-2xl border border-white/[0.06] bg-surface-1 overflow-hidden">
            <button onClick={handleClearChat} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-2 transition-colors text-left">
              <Icon name="cleaning_services" size={20} className="text-text-secondary" />
              <span className="flex-1 text-sm text-text-primary">Clear Chat History</span>
            </button>
            <button onClick={handleBlockUser} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/5 transition-colors text-left border-t border-white/[0.03]">
              <Icon name="block" size={20} className="text-brand-ember" />
              <span className="flex-1 text-sm text-brand-ember">Block {displayName}</span>
            </button>
            <button onClick={handleDeleteChat} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/5 transition-colors text-left border-t border-white/[0.03]">
              <Icon name="delete" size={20} className="text-brand-ember" />
              <span className="flex-1 text-sm text-brand-ember">Delete Chat</span>
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-surface-2 text-white text-sm font-medium px-5 py-2.5 rounded-full border border-white/[0.06] shadow-xl z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}