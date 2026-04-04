// src/screens/ChatThreadScreen.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, setDoc, deleteDoc, getDocs, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { startVoiceRecording, stopVoiceRecording, uploadMediaFile, uploadBlob, getYouTubeID } from '../../utils/mediaHelpers';
import { getChatBgStyle } from '../../utils/chatBackgrounds';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import EmojiPicker from '../../components/EmojiPicker';
import MediaPanel from '../../components/MediaPanel';
import TypingIndicator from '../../components/TypingIndicator';
import MediaPreview from '../../components/MediaPreview';
import LinkPreviewCard, { extractUrl } from '../../components/LinkPreview';
import { ReactionBubbles, MessageContextMenu } from '../../components/MessageContextMenu';
import useResponsive from '../../hooks/useResponsive';
import useTyping from '../../hooks/useTyping';
import useMessages from '../../hooks/useMessages';
import useTier from '../../hooks/useTier';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import UpgradeModal from '../../components/UpgradeModal';

// New imports for attachment features
import AttachmentMenu from '../../components/AttachmentMenu';
import ContactSubMenu from '../../components/ContactSubMenu';
import LocationSubMenu from '../../components/LocationSubMenu';
import LocationPickerModal from '../../components/LocationPickerModal';
import SendCoinsModal from '../../components/SendCoinsModal';
import { getWallet, sendCoins } from '../../firebase/firestore';

/* ═══════ AudioPlayer (voice notes + audio files) ═══════ */
const AudioPlayer = ({ url, isMe, label }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const barsRef = useRef([]);

  useEffect(() => {
    let seed = 0;
    for (let i = 0; i < (url || '').length; i++) seed = ((seed << 5) - seed + (url || '').charCodeAt(i)) | 0;
    const sr = (s) => { s = Math.sin(s) * 10000; return s - Math.floor(s); };
    barsRef.current = Array.from({ length: 36 }, (_, i) => 0.15 + sr(seed + i) * 0.85);
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play().catch(() => {});
    setIsPlaying(!isPlaying);
  };
  const onTimeUpdate = () => { if (!audioRef.current) return; const c = audioRef.current.currentTime, t = audioRef.current.duration; if (t > 0) setProgress((c / t) * 100); };
  const onLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };
  const seekTo = (e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left; const pct = Math.max(0, Math.min(1, x / rect.width)); if (audioRef.current?.duration) { audioRef.current.currentTime = pct * audioRef.current.duration; setProgress(pct * 100); } };
  const fmt = (t) => { if (isNaN(t)) return '0:00'; return `${Math.floor(t/60)}:${Math.floor(t%60).toString().padStart(2,'0')}`; };

  return (
    <div className={`flex flex-col p-3 min-w-[240px] ${isMe ? 'text-white' : 'text-white'}`}>
      {label && <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 truncate ${isMe ? 'text-white/50' : 'text-text-muted'}`}><Icon name="audio_file" size={12} className="inline mr-1" />{label}</p>}
      <div className="flex items-center gap-3">
        <button onClick={togglePlay} className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isMe ? 'bg-white/20 text-white' : 'bg-brand-cyan/20 text-brand-cyan'}`}>
          <Icon name={isPlaying ? 'pause' : 'play_arrow'} size={28} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-end gap-[2px] h-7 cursor-pointer" onClick={seekTo}>
            {barsRef.current.map((h, i) => (<div key={i} className={`flex-1 rounded-full transition-colors duration-75 ${isMe ? ((i / barsRef.current.length) * 100 < progress ? 'bg-white/70' : 'bg-white/20') : ((i / barsRef.current.length) * 100 < progress ? 'bg-brand-cyan' : 'bg-white/15')}`} style={{ height: `${h * 100}%`, minWidth: 2 }} />))}
          </div>
          <div className="flex justify-between items-center mt-1 px-0.5">
            <span className="text-[10px] font-bold opacity-60">{isPlaying ? fmt(audioRef.current?.currentTime) : fmt(duration)}</span>
            <Icon name="graphic_eq" size={14} className="opacity-40" />
          </div>
        </div>
      </div>
      <audio ref={audioRef} src={url} preload="metadata" onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} onEnded={() => { setIsPlaying(false); setProgress(0); }} />
    </div>
  );
};

/* ═══════ Day Separator ═══════ */
const DaySeparator = ({ date }) => {
  const now = new Date(); const d = new Date(date);
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = d.toDateString() === new Date(now - 86400000).toDateString();
  const label = isToday ? 'Today' : isYesterday ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (<div className="flex items-center justify-center py-3"><span className="px-4 py-1.5 bg-bg-dark/70 backdrop-blur-sm rounded-full text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] border border-white/[0.04]" >{label}</span></div>);
};

/* ═══════ Inline Timestamp (Telegram-style, inside bubble) ═══════ */
const InlineTime = ({ time, isMe, read, status, edited }) => (
  <span className={`inline-flex items-center gap-1 float-right ml-3 mt-1 relative top-[3px] ${isMe ? 'text-white/50' : 'text-white/40'}`}>
    {edited && <span className="text-[8px] italic">edited</span>}
    <span className="text-[9px] font-medium">{time}</span>
    {isMe && (
      status === 'sending'
        ? <Icon name="schedule" size={11} className="opacity-50" />
        : read
          ? <Icon name="done_all" size={11} className="text-brand-cyan" />
          : <Icon name="done_all" size={11} className="opacity-60" />
    )}
  </span>
);

/* ═══════ Quoted Reply Bar ═══════ */
const QuotedReply = ({ replyTo, isMe }) => {
  if (!replyTo) return null;
  const scrollToMsg = () => {
    const el = document.getElementById(`msg-${replyTo.id}`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-brand-cyan/50'); setTimeout(() => el.classList.remove('ring-2', 'ring-brand-cyan/50'), 2000); }
  };
  return (
    <div onClick={scrollToMsg} className={`mx-3 mt-2 mb-1 pl-3 border-l-2 rounded-r-lg py-1.5 pr-3 cursor-pointer active:opacity-70 ${isMe ? 'border-white/30 bg-white/10' : 'border-brand-cyan/50 bg-brand-cyan/5'}`}>
      <p className={`text-[10px] font-bold ${isMe ? 'text-white/70' : 'text-brand-cyan'}`}>{replyTo.senderName || 'User'}</p>
      <p className={`text-[11px] truncate ${isMe ? 'text-white/50' : 'text-text-muted'}`}>{replyTo.text || 'Media'}</p>
    </div>
  );
};

/* ═══════ Forward Modal ═══════ */
const ForwardModal = ({ message, onClose }) => {
  const [convos, setConvos] = useState([]);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', auth.currentUser.uid), where('status', '==', 'active'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setConvos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const forward = async (convoId) => {
    setSending(convoId);
    try {
      await addDoc(collection(db, 'conversations', convoId, 'messages'), {
        senderId: auth.currentUser.uid, createdAt: serverTimestamp(),
        type: message.type || 'text', text: message.text || '', contentUrl: message.contentUrl || '',
        forwarded: true, forwardedFrom: message.senderId,
      });
      await updateDoc(doc(db, 'conversations', convoId), {
        lastMessageText: `Forwarded: ${message.text?.slice(0, 30) || 'media'}`,
        lastMessageAt: serverTimestamp(), lastMessageSenderId: auth.currentUser.uid,
      });
      onClose();
    } catch (err) { console.error('Forward error:', err); setSending(null); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-surface-1 w-full max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <h3 className="text-white font-bold text-sm">Forward to...</h3>
          <button onClick={onClose} className="text-text-muted"><Icon name="close" size={20} /></button>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          {convos.map(c => {
            const otherId = c.participants?.find(id => id !== auth.currentUser.uid);
            const name = c.isGroup ? c.groupName : c.metadata?.[otherId]?.name || 'Chat';
            return (
              <button key={c.id} onClick={() => forward(c.id)} disabled={sending === c.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2/50 text-left transition-colors disabled:opacity-50">
                <UserAvatar src={c.isGroup ? c.groupIcon : c.metadata?.[otherId]?.avatar} size={40} />
                <span className="text-sm text-text-primary font-medium flex-1 truncate">{name}</span>
                {sending === c.id && <div className="w-4 h-4 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CHAT THREAD SCREEN
   ═══════════════════════════════════════════════════════════ */
export default function ChatThreadScreen() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef();
  const containerRef = useRef();
  const recorderRef = useRef(null);
  const recorderReadyRef = useRef(null);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  const recordingInterval = useRef(null);
  const { isDesktop } = useResponsive();
  const { typingUsers, setTyping, clearTyping } = useTyping(chatId);
  const { messages, rawMessages, loading } = useMessages(chatId);
  const { tier, tierConfig, checkFeature, checkFileSize } = useTier();

  const [chatInfo, setChatInfo] = useState(null);
  const otherUserId = chatInfo?.participants?.find(id => id !== auth.currentUser?.uid);
  const otherUser = chatInfo?.metadata?.[otherUserId];
  const { isOnline: otherOnline, lastSeen: otherLastSeen } = useOnlineStatus(otherUserId);
  const [input, setInput] = useState('');
  const [showMedia, setShowMedia] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [contextMenuMsgId, setContextMenuMsgId] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [optimisticMsgs, setOptimisticMsgs] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, requiredTier: 'lite', message: '' });
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Attachment menu states
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showContactSubMenu, setShowContactSubMenu] = useState(false);
  const [showLocationSubMenu, setShowLocationSubMenu] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSendCoinsModal, setShowSendCoinsModal] = useState(false);
  const [recordMode, setRecordMode] = useState('mic'); // 'mic' or 'camera'
  const [showRecordModeHover, setShowRecordModeHover] = useState(false);

  const swipeRef = useRef({ startX: 0, startY: 0, msgId: null, swiping: false });

  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, 'conversations', chatId), (d) => { if (d.exists()) setChatInfo(d.data()); });
    return () => unsub();
  }, [chatId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
    }
    setShowScrollButton(!isNearBottom);
  }, [messages.length, optimisticMsgs.length, typingUsers.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
    return () => clearTimeout(t);
  }, [messages.length, optimisticMsgs.length, typingUsers.length]);

  useEffect(() => {
    if (!chatId || !auth.currentUser || !rawMessages.length) return;
    const uid = auth.currentUser.uid;
    const unreadFromOthers = rawMessages.filter(m => m.senderId !== uid && !m.read && !m.deleted);
    if (unreadFromOthers.length === 0) return;
    const markRead = async () => {
      try {
        const batch = writeBatch(db);
        unreadFromOthers.forEach(m => { batch.update(doc(db, 'conversations', chatId, 'messages', m.id), { read: true, readAt: serverTimestamp() }); });
        batch.update(doc(db, 'conversations', chatId), { [`unreadCount.${uid}`]: 0 });
        await batch.commit();
      } catch (err) { /* silently fail */ }
    };
    const timer = setTimeout(markRead, 500);
    return () => clearTimeout(timer);
  }, [chatId, rawMessages]);

  const bgStyle = getChatBgStyle(chatInfo?.chatBackground, chatInfo?.chatBackgroundImage);

  // Debug: log the background image URL
  useEffect(() => {
    console.log('🎨 Background image URL:', bgStyle.backgroundImage);
  }, [bgStyle]);

  const sendMsg = async (payload) => {
    const tempId = `temp-${Date.now()}`;
    setOptimisticMsgs(prev => [...prev, { id: tempId, senderId: auth.currentUser.uid, createdAt: Timestamp.now(), _status: 'sending', ...payload }]);
    try {
      const msgData = { senderId: auth.currentUser.uid, createdAt: serverTimestamp(), ...payload };
      if (replyTo) { msgData.replyTo = { id: replyTo.id, text: (replyTo.text || '').slice(0, 100), senderName: replyTo.senderName || 'User', senderId: replyTo.senderId }; }
      await addDoc(collection(db, 'conversations', chatId, 'messages'), msgData);
      const typeLabels = { image: 'a photo', video: 'a video', voice: 'a voice message', audio: 'an audio file', giphy: 'a GIF', file: 'a file', sticker: 'a sticker', clip: 'a clip', meme: 'a meme' };
      await updateDoc(doc(db, 'conversations', chatId), { lastMessageText: payload.text || `Sent ${typeLabels[payload.type] || 'a message'}`, lastMessageAt: serverTimestamp(), lastMessageSenderId: auth.currentUser.uid });
      setOptimisticMsgs(prev => prev.filter(m => m.id !== tempId));
    } catch (err) {
      console.error('Send failed:', err);
      setOptimisticMsgs(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'failed' } : m));
    }
    setReplyTo(null);
    clearTyping();
  };

  const handleTextSend = async () => {
    if (!input.trim()) return;
    if (editingMsg) {
      try { await updateDoc(doc(db, 'conversations', chatId, 'messages', editingMsg.id), { text: input.trim(), editedAt: serverTimestamp() }); } catch (err) { console.error('Edit failed:', err); }
      setEditingMsg(null); setInput('');
      if (inputRef.current) inputRef.current.style.height = '44px';
      return;
    }
    sendMsg({ text: input.trim(), type: 'text' });
    setInput('');
    if (inputRef.current) inputRef.current.style.height = '44px';
    inputRef.current?.focus();
  };

  const handleMediaSelect = (type, url, item) => {
    if (type === 'gifs') sendMsg({ type: 'giphy', contentUrl: url });
    else if (type === 'stickers') sendMsg({ type: 'sticker', contentUrl: url });
    else if (type === 'clips') {
      // Store the gif URL for display, and video URL for playback
      const gifUrl = item?.formats?.gif || item?.preview || url;
      const videoUrl = item?.formats?.webm || item?.formats?.mp4 || '';
      sendMsg({ type: 'clip', contentUrl: gifUrl, videoUrl });
    }
    setShowMedia(null);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = '';
    const sizeCheck = checkFileSize(file.size);
    if (!sizeCheck.allowed) {
      setUpgradeModal({ open: true, requiredTier: sizeCheck.requiredTier, message: sizeCheck.message });
      return;
    }
    setPreviewFile(file);
  };

  const handleMediaSend = async (file, caption = '') => {
    setPreviewFile(null);
    const isImage = file.type?.startsWith('image/'); const isVideo = file.type?.startsWith('video/'); const isAudio = file.type?.startsWith('audio/');
    let folder, msgType;
    if (isImage) { folder = 'chat_images'; msgType = 'image'; } else if (isVideo) { folder = 'chat_videos'; msgType = 'video'; } else if (isAudio) { folder = 'voice_notes'; msgType = 'audio'; } else { folder = 'chat_files'; msgType = 'file'; }
    const tempId = `temp-${Date.now()}`; const localUrl = URL.createObjectURL(file);
    setOptimisticMsgs(prev => [...prev, { id: tempId, senderId: auth.currentUser.uid, createdAt: Timestamp.now(), type: msgType, contentUrl: localUrl, text: caption || file.name, _status: 'sending', fileName: file.name, fileSize: file.size }]);
    try {
      const url = await uploadMediaFile(file, folder, tier, tierConfig.mediaRetentionDays);
      await addDoc(collection(db, 'conversations', chatId, 'messages'), { senderId: auth.currentUser.uid, createdAt: serverTimestamp(), type: msgType, contentUrl: url, text: caption || (msgType === 'file' ? file.name : ''), fileName: file.name, fileSize: file.size });
      const typeLabels = { image: 'a photo', video: 'a video', audio: 'an audio file', file: 'a file' };
      await updateDoc(doc(db, 'conversations', chatId), { lastMessageText: caption || `Sent ${typeLabels[msgType]}`, lastMessageAt: serverTimestamp(), lastMessageSenderId: auth.currentUser.uid });
      setOptimisticMsgs(prev => prev.filter(m => m.id !== tempId));
    } catch (err) { console.error('Media send failed:', err); setOptimisticMsgs(prev => prev.map(m => m.id === tempId ? { ...m, _status: 'failed' } : m)); }
  };

  const handleVoiceStart = async () => {
    try {
      setIsRecording(true); setRecordingTime(0);
      recorderReadyRef.current = startVoiceRecording();
      const r = await recorderReadyRef.current;
      recorderRef.current = r;
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (e) {
      console.error('Error accessing microphone:', e);
      setIsRecording(false); recorderRef.current = null; recorderReadyRef.current = null;
      if (e.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permission in your browser settings.');
      }
    }
  };
  const handleVoiceStop = async () => {
    setIsRecording(false); clearInterval(recordingInterval.current);
    let rec = recorderRef.current; if (!rec && recorderReadyRef.current) { try { rec = await recorderReadyRef.current; } catch { return; } }
    recorderReadyRef.current = null; if (!rec || rec.state === 'inactive') { recorderRef.current = null; return; }
    try { const blob = await stopVoiceRecording(rec); if (blob.size > 0) { const url = await uploadBlob(blob, 'voice_notes'); sendMsg({ type: 'voice', contentUrl: url }); } }
    catch (err) { console.error('Voice send error:', err); } finally { recorderRef.current = null; }
  };

  const startCall = async (type) => {
    if (!chatInfo) return;
    try { await setDoc(doc(db, 'calls', chatId), { callerId: auth.currentUser.uid, callerName: auth.currentUser.displayName || 'Anonymous Pilot', callerAvatar: auth.currentUser.photoURL || '', type, status: 'ringing', participants: chatInfo.participants, createdAt: serverTimestamp() }); navigate(`/call/${chatId}/${type}`); }
    catch (error) { console.error('Call init failed:', error); }
  };

  const handleMsgLongPress = (msgId) => { longPressTimer.current = setTimeout(() => setContextMenuMsgId(prev => prev === msgId ? null : msgId), 400); };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  const handleSwipeStart = (e, msg) => {
    const touch = e.touches[0];
    swipeRef.current = { startX: touch.clientX, startY: touch.clientY, msgId: msg.id, msg, swiping: false, el: e.currentTarget };
  };
  const handleSwipeMove = (e) => {
    const sw = swipeRef.current;
    if (!sw.msgId) return;
    const touch = e.touches[0];
    const dx = touch.clientX - sw.startX;
    const dy = Math.abs(touch.clientY - sw.startY);
    if (dy > 30 && !sw.swiping) { sw.msgId = null; return; }
    if (dx > 15) {
      sw.swiping = true;
      const offset = Math.min(dx - 15, 80);
      if (sw.el) sw.el.style.transform = `translateX(${offset}px)`;
      if (sw.el) sw.el.style.transition = 'none';
    }
  };
  const handleSwipeEnd = () => {
    const sw = swipeRef.current;
    if (sw.el) { sw.el.style.transform = ''; sw.el.style.transition = 'transform 0.2s'; }
    if (sw.swiping && sw.msg) {
      const senderName = sw.msg.senderId === auth.currentUser?.uid ? 'You' : (chatInfo?.metadata?.[sw.msg.senderId]?.name || 'User');
      setReplyTo({ id: sw.msg.id, text: sw.msg.text || 'Media', senderName, senderId: sw.msg.senderId });
      inputRef.current?.focus();
    }
    swipeRef.current = { startX: 0, startY: 0, msgId: null, swiping: false };
  };

  const handleReply = (msg) => {
    const senderName = msg.senderId === auth.currentUser?.uid ? 'You' : (chatInfo?.metadata?.[msg.senderId]?.name || 'User');
    setReplyTo({ id: msg.id, text: msg.text || (msg.type === 'image' ? '📷 Photo' : msg.type === 'voice' ? '🎤 Voice' : msg.type === 'video' ? '🎬 Video' : msg.type === 'sticker' ? msg.stickerLabel || '🎯 Sticker' : 'Media'), senderName, senderId: msg.senderId });
    setEditingMsg(null); inputRef.current?.focus();
  };
  const handleEdit = (msg) => {
    if (msg.senderId !== auth.currentUser?.uid) return;
    if (!msg.text) return; // Can only edit messages that have text
    setEditingMsg({ id: msg.id, text: msg.text }); setInput(msg.text || ''); setReplyTo(null); setContextMenuMsgId(null); inputRef.current?.focus();
  };
  const handlePin = async (msg) => {
    try {
      const isPinned = chatInfo?.pinnedMessage?.id === msg.id;
      await updateDoc(doc(db, 'conversations', chatId), { pinnedMessage: isPinned ? null : { id: msg.id, text: (msg.text || '').slice(0, 100), senderId: msg.senderId } });
    } catch (err) { console.error('Pin error:', err); }
  };

  const handleInputChange = (e) => { setInput(e.target.value); setTyping(); };

  // Attachment menu handlers
  const handleCamera = () => {
    document.getElementById(`camera-up-${chatId}`).click();
  };

  const handleMusic = () => {
    document.getElementById(`music-up-${chatId}`).click();
  };

  const handleLocation = () => {
    setShowLocationSubMenu(true);
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendMsg({
          type: 'location',
          text: `📍 Current location: ${latitude}, ${longitude}`,
          location: { lat: latitude, lng: longitude, type: 'current' },
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Unable to get location. Please check permissions.');
      }
    );
  };

  const handleChooseOnMap = () => {
    setShowLocationPicker(true);
  };

  const handleLocationConfirm = (coords, address) => {
    sendMsg({
      type: 'location',
      text: `📍 ${address}`,
      location: { lat: coords.lat, lng: coords.lng, address, type: 'pinned' },
    });
  };

  const handleContact = () => {
    setShowContactSubMenu(true);
  };

  const handleShareVergrUser = () => {
    const username = prompt('Enter the username of the Vergr user:');
    if (!username) return;
    sendMsg({
      type: 'contact',
      text: `👤 Contact: @${username}`,
      contact: { type: 'vergr', username },
    });
  };

  const handleSharePhoneContact = async () => {
    if (!('contacts' in navigator)) {
      // Fallback: manual input
      const name = prompt('Enter contact name:');
      const phone = prompt('Enter phone number:');
      if (name && phone) {
        sendMsg({
          type: 'contact',
          text: `📞 ${name}: ${phone}`,
          contact: { type: 'phone', name, phone },
        });
      }
      return;
    }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (contacts.length) {
        const contact = contacts[0];
        sendMsg({
          type: 'contact',
          text: `📞 ${contact.name[0]}: ${contact.tel[0]}`,
          contact: { type: 'phone', name: contact.name[0], phone: contact.tel[0] },
        });
      }
    } catch (err) {
      console.error('Contact picker error:', err);
      alert('Could not select contact');
    }
  };

  const handleWallet = () => {
    if (!otherUser) {
      alert('Cannot send coins – user not found');
      return;
    }
    setShowSendCoinsModal(true);
  };

  const renderMessageContent = (m, isMe) => {
    const time = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const timeEl = <InlineTime time={time} isMe={isMe} read={m.read} status={m._status} edited={!!m.editedAt} />;

    if (m.deleted) {
      return <p className={`px-4 py-2.5 text-sm italic ${isMe ? 'text-white/40' : 'text-text-muted/60'}`}><Icon name="block" size={14} className="inline mr-1.5 relative top-[-1px]" />This message was deleted{timeEl}</p>;
    }

    const forwardedLabel = m.forwarded ? (<p className={`px-4 pt-2 text-[10px] font-bold ${isMe ? 'text-white/40' : 'text-brand-cyan/60'}`}><Icon name="shortcut" size={12} className="inline mr-1" />Forwarded</p>) : null;
    const ytId = m.type === 'text' ? getYouTubeID(m.text) : null;

    if (ytId) {
      return (<div className="flex flex-col">{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><p className="px-4 py-2.5 text-sm break-words">{m.text}{timeEl}</p><div className="relative aspect-video"><iframe src={`https://www.youtube.com/embed/${ytId}`} className="w-full h-full" allowFullScreen title="YT" /></div></div>);
    }

    switch (m.type) {
      case 'sticker':
        return (
          <div className="relative inline-block">
            {forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} />
            {m.contentUrl ? (
              <img src={m.contentUrl} alt="Sticker" className="w-36 h-36 object-contain drop-shadow-md" loading="lazy" style={{ background: 'transparent' }} />
            ) : (
              <span className="text-6xl leading-none">{m.text}</span>
            )}
            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm flex items-center gap-1">
              <span className="text-[9px] text-white/80 font-medium">{time}</span>
              {isMe && (m.read ? <Icon name="done_all" size={11} className="text-brand-cyan" /> : <Icon name="done_all" size={11} className="text-white/50" />)}
            </span>
          </div>
        );

      case 'clip':
        return (
          <div className="relative">
            {forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} />
            {m.videoUrl ? (
              <video src={m.videoUrl} poster={m.contentUrl} controls loop className="w-full max-h-64 rounded-sm" preload="metadata" playsInline />
            ) : (
              <img src={m.contentUrl} alt="Clip" className="w-full max-h-64 object-cover rounded-sm" loading="lazy" />
            )}
            <span className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isMe ? 'bg-bg-dark/50 text-white' : 'bg-black/50 text-white'}`}>{time}{isMe && (m.read ? <Icon name="done_all" size={11} className="text-brand-cyan" /> : <Icon name="done_all" size={11} className="opacity-60" />)}</span>
          </div>
        );

      case 'meme':
        return (
          <div className="relative">
            {forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} />
            <img src={m.contentUrl} className="w-full rounded-sm" alt="Meme" loading="lazy" />
            <span className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isMe ? 'bg-bg-dark/50 text-white' : 'bg-black/50 text-white'}`}>{time}{isMe && (m.read ? <Icon name="done_all" size={11} className="text-brand-cyan" /> : <Icon name="done_all" size={11} className="opacity-60" />)}</span>
          </div>
        );

      case 'giphy':
        return (<div className="relative">{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><img src={m.contentUrl} className="w-full rounded-sm" alt="GIF" loading="lazy" /><span className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isMe ? 'bg-bg-dark/50 text-white' : 'bg-black/50 text-white'}`}>{time}{isMe && (m.read ? <Icon name="done_all" size={11} className="text-brand-cyan" /> : <Icon name="done_all" size={11} className="opacity-60" />)}</span></div>);

      case 'image':
        return (<div className="relative">{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><img src={m.contentUrl} className="w-full max-h-80 object-cover" alt="" loading="lazy" />{m.text && m.text !== m.fileName && <p className="px-4 py-2 text-sm break-words">{m.text}</p>}<span className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium ${isMe ? 'bg-bg-dark/50 text-white' : 'bg-black/50 text-white'}`}>{time}{isMe && (m.read ? <Icon name="done_all" size={11} className="text-brand-cyan" /> : <Icon name="done_all" size={11} className="opacity-60" />)}</span></div>);

      case 'video':
        return (<div className="relative">{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><video src={m.contentUrl} controls className="w-full max-h-80 rounded-sm" preload="metadata" />{m.text && m.text !== m.fileName && <p className="px-4 py-2 text-sm break-words">{m.text}{timeEl}</p>}</div>);

      case 'voice':
        return (<div>{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><AudioPlayer url={m.contentUrl} isMe={isMe} /></div>);

      case 'audio':
        return (<div>{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} /><AudioPlayer url={m.contentUrl} isMe={isMe} label={m.fileName} /></div>);

      case 'file':
        return (
          <div>{forwardedLabel}<QuotedReply replyTo={m.replyTo} isMe={isMe} />
          <a href={m.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition-opacity min-w-[200px]">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/15' : 'bg-brand-cyan/10'}`}><Icon name="description" size={20} className={isMe ? 'text-white/70' : 'text-brand-cyan'} /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{m.fileName || m.text || 'File'}</p>{m.fileSize && <p className={`text-[10px] ${isMe ? 'text-white/50' : 'text-text-muted'}`}>{m.fileSize < 1048576 ? `${(m.fileSize / 1024).toFixed(1)} KB` : `${(m.fileSize / 1048576).toFixed(1)} MB`}</p>}</div>
            <Icon name="download" size={18} className={isMe ? 'text-white/40' : 'text-text-muted'} />
          </a></div>
        );

      case 'location':
        const { lat, lng, address } = m.location || {};
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        return (
          <div>
            {forwardedLabel}
            <QuotedReply replyTo={m.replyTo} isMe={isMe} />
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Icon name="location_on" size={20} className="text-brand-cyan" />
                <span className="text-sm">{m.text || `${address || `${lat}, ${lng}`}`}</span>
              </div>
            </a>
            {timeEl}
          </div>
        );

      case 'contact':
        const { type, username, name, phone } = m.contact || {};
        return (
          <div>
            {forwardedLabel}
            <QuotedReply replyTo={m.replyTo} isMe={isMe} />
            <div className="px-4 py-2.5 flex items-center gap-2">
              <Icon name="contact_mail" size={20} className="text-brand-cyan" />
              <span className="text-sm">
                {type === 'vergr' ? `👤 @${username}` : `📞 ${name}: ${phone}`}
              </span>
            </div>
            {timeEl}
          </div>
        );

      case 'wallet':
        const { amount } = m.wallet || {};
        return (
          <div>
            {forwardedLabel}
            <QuotedReply replyTo={m.replyTo} isMe={isMe} />
            <div className="px-4 py-2.5 flex items-center gap-2">
              <Icon name="attach_money" size={20} className="text-brand-cyan" />
              <span className="text-sm">{m.text || `💸 Sent ${amount} coins`}</span>
            </div>
            {timeEl}
          </div>
        );

      default: {
        const linkUrl = extractUrl(m.text);
        return (
          <div>
            {forwardedLabel}
            <QuotedReply replyTo={m.replyTo} isMe={isMe} />
            <p className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}{timeEl}</p>
            {linkUrl && <LinkPreviewCard url={linkUrl} isMe={isMe} />}
          </div>
        );
      }
    }
  };

  const retryMessage = (msg) => { setOptimisticMsgs(prev => prev.filter(m => m.id !== msg.id)); const { id, _status, ...payload } = msg; sendMsg(payload); };

  const allMessages = [...messages, ...optimisticMsgs.filter(opt => { const last5 = messages.slice(-5); return !last5.some(m => m.text === opt.text && m.senderId === opt.senderId && m.type === opt.type); })];
  const displayMessages = searchQuery ? allMessages.filter(m => m._type === 'separator' || (m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()))) : allMessages;

  const formatLastSeen = () => {
    if (otherOnline) return null;
    if (otherLastSeen) { const diff = Date.now() - otherLastSeen; if (diff < 60000) return 'last seen just now'; if (diff < 3600000) return `last seen ${Math.floor(diff / 60000)}m ago`; if (diff < 86400000) return `last seen ${Math.floor(diff / 3600000)}h ago`; return `last seen ${otherLastSeen.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`; }
    return 'Offline';
  };

  const closeAllPickers = () => { setShowEmoji(false); setShowMedia(null); };

  return (
    <div className={`flex flex-col ${isDesktop ? 'h-screen' : 'h-[100dvh]'} overflow-hidden relative`} style={bgStyle}>

      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 h-[52px] z-20" style={{ background: 'rgba(7,8,13,0.55)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <button onClick={() => navigate(-1)} className={isDesktop ? 'hidden' : 'shrink-0 text-text-secondary'}><Icon name="arrow_back" size={22} /></button>
        <div className="relative shrink-0 cursor-pointer" onClick={() => !chatInfo?.isGroup && navigate(`/messages/${chatId}/details`)}>
          <UserAvatar src={chatInfo?.isGroup ? chatInfo.groupIcon : otherUser?.avatar} size={38} />
          {otherOnline && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-bg-dark rounded-full" />}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => !chatInfo?.isGroup && navigate(`/messages/${chatId}/details`)}>
          <h2 className="text-text-primary font-semibold text-sm truncate group-hover:text-text-primary transition-colors">{chatInfo?.isGroup ? chatInfo.groupName : otherUser?.name || 'Chat'}</h2>
          <p className="text-[10px] font-bold uppercase tracking-tighter">
            {typingUsers.some(u => u.uid === otherUserId) ? (
              <span className="text-brand-cyan animate-pulse">typing...</span>
            ) : otherOnline ? (
              <span className="text-green-400">Active now</span>
            ) : (
              <span className="text-text-muted opacity-60">{formatLastSeen()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => setShowSearch(s => !s)} className="text-text-muted hover:text-text-secondary transition-colors p-1.5"><Icon name="search" size={20} /></button>
          <button onClick={() => startCall('video')} className="text-text-muted hover:text-text-secondary transition-colors p-1.5"><Icon name="videocam" size={20} /></button>
          <button onClick={() => startCall('voice')} className="text-text-muted hover:text-text-secondary transition-colors p-1.5"><Icon name="call" size={18} /></button>
          <button onClick={() => setShowHeaderMenu(s => !s)} className="text-text-muted hover:text-text-secondary transition-colors p-1.5"><Icon name="more_vert" size={20} /></button>
          {showHeaderMenu && <div className="fixed inset-0 z-30" onClick={() => setShowHeaderMenu(false)} />}
        </div>
        {showHeaderMenu && (
          <div className="absolute right-4 top-14 z-40 w-52 bg-surface-1 border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
            {[
              { icon: 'search', label: 'Search', action: () => { setShowSearch(true); setShowHeaderMenu(false); } },
              { icon: 'notifications_off', label: chatInfo?.muted ? 'Unmute' : 'Mute', action: async () => { try { await updateDoc(doc(db, 'conversations', chatId), { muted: !chatInfo?.muted }); } catch {} setShowHeaderMenu(false); } },
              { icon: 'wallpaper', label: 'Change Wallpaper', action: () => { navigate(`/messages/${chatId}/settings`); setShowHeaderMenu(false); } },
              { icon: 'cleaning_services', label: 'Clear Chat', action: async () => { if (!window.confirm('Clear all messages in this chat?')) return; try { const snap = await getDocs(collection(db, 'conversations', chatId, 'messages')); const batch = writeBatch(db); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); } catch {} setShowHeaderMenu(false); } },
              { icon: 'delete', label: 'Delete Chat', danger: true, action: async () => { if (!window.confirm('Delete this entire chat? This cannot be undone.')) return; try { await updateDoc(doc(db, 'conversations', chatId), { status: 'deleted' }); navigate('/messages'); } catch {} setShowHeaderMenu(false); } },
            ].map((item, i) => (
              <button key={item.label} onClick={item.action}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors ${i > 0 ? 'border-t border-white/[0.03]' : ''}`}>
                <Icon name={item.icon} size={18} className={item.danger ? 'text-brand-ember' : 'text-text-secondary'} />
                <span className={`text-sm ${item.danger ? 'text-brand-ember' : 'text-text-primary'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {showSearch && (() => {
        const searchResults = searchQuery ? allMessages.filter(m => m._type !== 'separator' && m.text?.toLowerCase().includes(searchQuery.toLowerCase())) : [];
        const totalResults = searchResults.length;
        const scrollToResult = (idx) => {
          const msg = searchResults[idx];
          if (msg) { const el = document.getElementById(`msg-${msg.id}`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-brand-cyan/50'); setTimeout(() => el.classList.remove('ring-2', 'ring-brand-cyan/50'), 2000); } }
        };
        return (
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-white/[0.04] animate-slide-down">
            <Icon name="search" size={18} className="text-text-muted shrink-0" />
            <input autoFocus value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchIndex(0); }} placeholder="Search in chat..." className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-muted/60" />
            {searchQuery && totalResults > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-text-muted">{searchIndex + 1}/{totalResults}</span>
                <button onClick={() => { const next = (searchIndex - 1 + totalResults) % totalResults; setSearchIndex(next); scrollToResult(next); }} className="text-text-muted hover:text-white p-0.5"><Icon name="keyboard_arrow_up" size={18} /></button>
                <button onClick={() => { const next = (searchIndex + 1) % totalResults; setSearchIndex(next); scrollToResult(next); }} className="text-text-muted hover:text-white p-0.5"><Icon name="keyboard_arrow_down" size={18} /></button>
              </div>
            )}
            {searchQuery && totalResults === 0 && <span className="text-[10px] text-text-muted shrink-0">No results</span>}
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchIndex(0); }} className="text-text-muted hover:text-white"><Icon name="close" size={18} /></button>
          </div>
        );
      })()}

      {chatInfo?.pinnedMessage && !showSearch && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-2/80 border-b border-white/[0.03]">
          <button onClick={() => { const el = document.getElementById(`msg-${chatInfo.pinnedMessage.id}`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
            className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity">
            <Icon name="push_pin" size={16} className="text-brand-cyan shrink-0" />
            <div className="flex-1 min-w-0"><p className="text-[10px] text-brand-cyan font-bold">Pinned Message</p><p className="text-xs text-text-muted truncate">{chatInfo.pinnedMessage.text}</p></div>
          </button>
          <button onClick={async () => { try { await updateDoc(doc(db, 'conversations', chatId), { pinnedMessage: null }); } catch {} }}
            className="text-text-muted hover:text-white p-1 shrink-0" title="Unpin"><Icon name="close" size={16} /></button>
        </div>
      )}

      {/* Main content */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto no-scrollbar"
      >
        {/* Optional dark overlay for custom images (keeps your original logic) */}
        {chatInfo?.chatBackground === 'custom_image' && chatInfo?.chatBackgroundImage && (
          <div className="absolute inset-0 bg-bg-dark/50 pointer-events-none" />
        )}
        <div className="relative p-4 space-y-1 min-h-full flex flex-col justify-end">
          {loading && (<div className="text-center py-10"><div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin mx-auto mb-3" /><p className="text-text-muted text-[10px] font-bold uppercase tracking-widest">Loading...</p></div>)}

          {displayMessages.map((m) => {
            if (m._type === 'separator') return <DaySeparator key={m.id} date={m.date} />;
            const isMe = m.senderId === auth.currentUser?.uid;
            const isOptimistic = m._status === 'sending';
            const isFailed = m._status === 'failed';
            const isHighlighted = searchQuery && m.text?.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <motion.div key={m.id} id={`msg-${m.id}`}
                initial={isOptimistic ? { scale: 0.85, opacity: 0.5 } : { scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: isOptimistic ? 0.6 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isHighlighted ? 'bg-brand-cyan/5 -mx-2 px-2 rounded-lg' : ''}`}>
                <div className="flex flex-col max-w-[80%] lg:max-w-[65%]" style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div className="relative"
                    style={{ transition: 'transform 0.2s' }}
                    onTouchStart={(e) => handleSwipeStart(e, m)}
                    onTouchMove={handleSwipeMove}
                    onTouchEnd={handleSwipeEnd}
                    onMouseDown={() => handleMsgLongPress(m.id)} onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenuMsgId(prev => prev === m.id ? null : m.id); }}>

                    {contextMenuMsgId === m.id && (
                      <MessageContextMenu chatId={chatId} messageId={m.id} message={m} isMe={isMe} onClose={() => setContextMenuMsgId(null)}
                        onReply={handleReply} onEdit={handleEdit} onPin={handlePin} onForward={setForwardMsg} />
                    )}

                    <div className={`${m.type === 'sticker' ? '' : `rounded-2xl overflow-hidden break-words ${isMe ? 'text-white rounded-br-none' : 'bg-surface-2 text-white border border-white/[0.06] rounded-bl-none'}`} transition-opacity ${isOptimistic ? 'opacity-60' : ''} ${isFailed ? 'opacity-40 ring-1 ring-red-500/50' : ''}`}
                      style={m.type === 'sticker' ? undefined : isMe ? { background: '#1a6b5a' } : undefined}>
                      {renderMessageContent(m, isMe)}
                    </div>

                    {isFailed && <button onClick={() => retryMessage(m)} className="text-[9px] text-red-400 font-bold uppercase mt-0.5 px-1">Retry</button>}
                  </div>
                  {m.reactions && <ReactionBubbles reactions={m.reactions} chatId={chatId} messageId={m.id} isMe={isMe} />}
                </div>
              </motion.div>
            );
          })}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="flex gap-2 items-end">
                <div className="w-8 shrink-0">
                  <UserAvatar user={otherUser} size="xs" />
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </main>

      {/* Media Panel */}
      {showMedia && (
        <MediaPanel
          defaultTab={showMedia}
          onSelect={handleMediaSelect}
          onClose={() => setShowMedia(null)}
        />
      )}

      {/* Emoji Picker */}
      {showEmoji && <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} onClose={() => setShowEmoji(false)} />}

      {/* Input Footer */}
      <footer className="relative z-10 px-2 pb-2 pt-1.5 lg:px-3 lg:pb-3 lg:pt-2" style={{ background: 'rgba(7,8,13,0.45)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        {/* Reply / Edit bar */}
        {(replyTo || editingMsg) && (
          <div className="flex items-center gap-3 px-3 py-2 mb-1.5 bg-bg-dark/60 backdrop-blur-xl rounded-2xl border border-white/[0.08]">
            <div className={`w-[3px] self-stretch rounded-full ${editingMsg ? 'bg-brand-gold' : 'bg-brand-cyan'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-[10px] font-semibold ${editingMsg ? 'text-brand-gold' : 'text-brand-cyan'}`}>{editingMsg ? 'Editing' : `Reply to ${replyTo?.senderName}`}</p>
              <p className="text-[11px] text-text-muted truncate">{editingMsg?.text || replyTo?.text}</p>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }} className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2/50 transition-colors shrink-0"><Icon name="close" size={16} /></button>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {!isRecording ? (
            <>
              {/* Hidden file inputs */}
              <input type="file" id={`file-up-${chatId}`} hidden accept="*/*" onChange={handleFileSelect} />
              <input type="file" id={`media-up-${chatId}`} hidden accept="image/*,video/*,audio/*" onChange={handleFileSelect} />
              <input type="file" id={`camera-up-${chatId}`} hidden accept="image/*" capture="environment" onChange={handleFileSelect} />
              <input type="file" id={`music-up-${chatId}`} hidden accept="audio/*" onChange={handleFileSelect} />

              {/* Attachment button */}
              <button
                onClick={() => setShowAttachmentMenu(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2/40 transition-colors shrink-0 self-end"
              >
                <Icon name="attach_file" size={22} className="rotate-[315deg]" />
              </button>

              {/* Main input pill */}
              <div className="flex-1 flex items-end bg-surface-1/80 backdrop-blur-xl rounded-[22px] border border-white/[0.08] focus-within:border-white/[0.15] transition-colors min-h-[44px] min-w-0">
                {/* Emoji toggle */}
                <button onClick={() => { const on = !showEmoji; closeAllPickers(); if (on) setShowEmoji(true); }} className="w-[44px] h-[44px] shrink-0 flex items-center justify-center">
                  <Icon name={showEmoji ? 'keyboard' : 'sentiment_satisfied'} size={22} className={showEmoji ? 'text-brand-cyan' : 'text-text-muted'} />
                </button>

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setTyping();
                    e.target.style.height = '24px';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSend();
                    }
                  }}
                  placeholder={editingMsg ? 'Edit message...' : 'Message...'}
                  rows={1}
                  className="flex-1 w-full bg-transparent py-[10px] px-1 text-[14px] text-text-primary outline-none resize-none overflow-y-auto break-words whitespace-pre-wrap leading-[20px] placeholder:text-text-muted/50"
                  style={{ minHeight: '24px', maxHeight: '120px' }}
                />

                {/* Right side icons inside the pill */}
                {!input.trim() && (
                  <div className="flex items-center shrink-0 h-[44px]">
                    <button onClick={() => { const on = showMedia !== 'stickers'; closeAllPickers(); if (on) setShowMedia('stickers'); }} className="p-2">
                      <Icon name="sticky_note_2" size={20} className={showMedia === 'stickers' ? 'text-brand-cyan' : 'text-text-muted'} />
                    </button>
                    <button onClick={() => { const on = showMedia !== 'gifs'; closeAllPickers(); if (on) setShowMedia('gifs'); }} className="p-2">
                      <Icon name="gif_box" size={20} className={showMedia === 'gifs' ? 'text-brand-cyan' : 'text-text-muted'} />
                    </button>
                  </div>
                )}
              </div>

              {/* Send / Mic / Camera button */}
              <AnimatePresence mode="wait">
                {input.trim() ? (
                  <motion.button
                    key="send"
                    initial={{ scale: 0.5, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0.5, rotate: 90 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    onClick={handleTextSend}
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 self-end active:scale-90 transition-colors ${editingMsg ? 'bg-brand-gold text-bg-dark' : 'bg-brand-cyan text-bg-dark'}`}>
                    <Icon name={editingMsg ? 'check' : 'send'} size={18} />
                  </motion.button>
                ) : (
                  <motion.button
                    key={recordMode}
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      // Start a timer — if held >300ms, start recording
                      const timer = setTimeout(() => {
                        handleVoiceStart();
                      }, 300);
                      e.currentTarget._holdTimer = timer;
                      e.currentTarget._held = false;
                    }}
                    onPointerUp={(e) => {
                      clearTimeout(e.currentTarget._holdTimer);
                      if (isRecording) {
                        // Was recording — stop and send
                        handleVoiceStop();
                      } else {
                        // Was a short tap — toggle mode
                        setRecordMode(prev => prev === 'mic' ? 'camera' : 'mic');
                      }
                    }}
                    onPointerLeave={(e) => {
                      clearTimeout(e.currentTarget._holdTimer);
                      if (isRecording) handleVoiceStop();
                    }}
                    className="w-10 h-10 rounded-full bg-surface-1/80 backdrop-blur-sm border border-white/[0.08] flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-brand-cyan active:text-bg-dark active:border-brand-cyan transition-colors shrink-0 self-end">
                    <Icon name={recordMode === 'mic' ? 'mic' : 'videocam'} size={20} />
                  </motion.button>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* Recording state */
            <div className="flex-1 flex items-center gap-3 bg-surface-1/80 backdrop-blur-xl rounded-full px-4 py-2.5 border border-white/[0.08]">
              <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-text-primary text-sm font-dmmono flex-1">{Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
              <button onClick={() => { setIsRecording(false); setRecordingTime(0); }} className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors">
                <Icon name="delete" size={16} />
              </button>
              <button onClick={handleVoiceStop} className="w-9 h-9 rounded-full bg-brand-cyan text-bg-dark flex items-center justify-center active:scale-90 transition-transform">
                <Icon name="send" size={16} />
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* Floating scroll‑to‑bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={scrollToBottom}
            className="fixed bottom-20 right-4 z-50 w-9 h-9 rounded-full bg-surface-1 border border-white/[0.06] text-text-secondary flex items-center justify-center hover:text-text-primary active:scale-95 transition-colors"
            aria-label="Scroll to bottom"
          >
            <Icon name="arrow_downward" size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {previewFile && <MediaPreview file={previewFile} onSend={handleMediaSend} onCancel={() => setPreviewFile(null)} />}
      {forwardMsg && <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />}
      <UpgradeModal isOpen={upgradeModal.open} onClose={() => setUpgradeModal({ open: false, requiredTier: 'lite', message: '' })}
        requiredTier={upgradeModal.requiredTier} message={upgradeModal.message} />

      {/* Attachment Menu Components */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onGallery={() => document.getElementById(`media-up-${chatId}`).click()}
        onCamera={handleCamera}
        onFile={() => document.getElementById(`file-up-${chatId}`).click()}
        onLocation={handleLocation}
        onContact={handleContact}
        onMusic={handleMusic}
        onWallet={handleWallet}
      />

      <ContactSubMenu
        isOpen={showContactSubMenu}
        onClose={() => setShowContactSubMenu(false)}
        onShareVergrUser={handleShareVergrUser}
        onSharePhoneContact={handleSharePhoneContact}
      />

      <LocationSubMenu
        isOpen={showLocationSubMenu}
        onClose={() => setShowLocationSubMenu(false)}
        onCurrentLocation={handleCurrentLocation}
        onChooseOnMap={handleChooseOnMap}
      />

      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onConfirm={handleLocationConfirm}
        apiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      />

      <SendCoinsModal
        isOpen={showSendCoinsModal}
        onClose={() => setShowSendCoinsModal(false)}
        preselectedUser={otherUser}
      />
    </div>
  );
}