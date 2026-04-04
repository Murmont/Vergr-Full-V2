// src/screens/squads/SquadChatThreadScreen.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, deleteDoc, getDocs, where, setDoc, writeBatch, deleteField } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { startVoiceRecording, uploadMediaFile, getYouTubeID } from '../../utils/mediaHelpers';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import MediaPanel from '../../components/MediaPanel';
import UpgradeModal from '../../components/UpgradeModal';
import SquadPollComponent from '../../components/SquadPollComponent';
import TopBar from '../../components/TopBar';
import useResponsive from '../../hooks/useResponsive';
import useTier from '../../hooks/useTier';
import useTyping from '../../hooks/useTyping';
import { createSquadVote, setSquadChatBackground } from '../../firebase/firestore';
import VotePollCard from '../../components/VotePollCard';
import Modal from '../../components/Modal';
import EmojiPicker from '../../components/EmojiPicker';
import { ReactionBubbles, MessageContextMenu } from '../../components/MessageContextMenu';
import { extractUrl } from '../../components/LinkPreview';
import LinkPreviewCard from '../../components/LinkPreview';
import TypingIndicator from '../../components/TypingIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundPickerModal from '../../components/BackgroundPickerModal';
import ReactMarkdown from 'react-markdown';

// Helper to format time
const formatTime = (date) => {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Read receipts – inline with time
const ReadReceipts = ({ isMe, readBy, senderId, memberCount }) => {
  if (!isMe) return null;
  const readCount = readBy ? readBy.filter(uid => uid !== senderId).length : 0;
  const totalOthers = (memberCount || 0) - 1;
  const allRead = readCount >= totalOthers && totalOthers > 0;
  return (
    <span className="ml-1 inline-block align-middle">
      {allRead ? (
        <Icon name="done_all" size={12} className="text-brand-cyan" />
      ) : readCount > 0 ? (
        <Icon name="done_all" size={12} className="text-white/50" />
      ) : (
        <Icon name="done" size={12} className="text-white/50" />
      )}
    </span>
  );
};

// Audio player (unchanged)
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

// Quoted Reply Bar
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

// Forward Modal (supports multiple messages)
const ForwardModal = ({ messages, onClose }) => {
  const [convos, setConvos] = useState([]);
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'conversations'), where('participants', 'array-contains', auth.currentUser.uid), where('status', '==', 'active'), orderBy('lastMessageAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setConvos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, []);

  const forwardTo = async (convoId) => {
    setSending(convoId);
    try {
      const batch = writeBatch(db);
      for (const msg of messages) {
        const msgRef = doc(collection(db, 'conversations', convoId, 'messages'));
        batch.set(msgRef, {
          senderId: auth.currentUser.uid, createdAt: serverTimestamp(),
          type: msg.type || 'text', text: msg.text || '', contentUrl: msg.contentUrl || '',
          forwarded: true, forwardedFrom: msg.senderId,
        });
      }
      await batch.commit();
      await updateDoc(doc(db, 'conversations', convoId), {
        lastMessageText: `Forwarded ${messages.length} message(s)`,
        lastMessageAt: serverTimestamp(), lastMessageSenderId: auth.currentUser.uid,
      });
      onClose();
    } catch (err) { console.error('Forward error:', err); setSending(null); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-surface-1 w-full max-w-md max-h-[70vh] rounded-t-2xl sm:rounded-2xl border border-white/[0.06] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
          <h3 className="text-white font-bold text-sm">Forward {messages.length} message(s) to...</h3>
          <button onClick={onClose} className="text-text-muted"><Icon name="close" size={20} /></button>
        </div>
        <div className="overflow-y-auto max-h-[50vh]">
          {convos.map(c => {
            const otherId = c.participants?.find(id => id !== auth.currentUser.uid);
            const name = c.isGroup ? c.groupName : c.metadata?.[otherId]?.name || 'Chat';
            return (
              <button key={c.id} onClick={() => forwardTo(c.id)} disabled={sending === c.id}
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

// Custom markdown components with spoiler
const MarkdownComponents = {
  p: ({ node, ...props }) => <p className="text-sm leading-relaxed whitespace-pre-wrap break-words inline" {...props} />,
  strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  code: ({ node, ...props }) => <code className="bg-black/20 rounded px-1 font-mono text-xs" {...props} />,
  span: ({ node, className, ...props }) => {
    if (className === 'spoiler') {
      return <span className="spoiler" {...props} />;
    }
    return <span {...props} />;
  },
};

// Pre‑process spoilers: replace ||text|| with <span class="spoiler">text</span>
const processSpoilers = (text) => {
  return text.replace(/\|\|(.*?)\|\|/g, (_, match) => `<span class="spoiler">${match}</span>`);
};

export default function SquadChatThreadScreen() {
  const { squadId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef();
  const containerRef = useRef();
  const inputRef = useRef(null);
  const { isMobile } = useResponsive();
  const { tier, tierConfig, checkFileSize } = useTier();
  const { typingUsers, setTyping, clearTyping } = useTyping(squadId, 'squad');

  // State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [showMedia, setShowMedia] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [upgradeModal, setUpgradeModal] = useState({ open: false, requiredTier: 'lite', message: '' });
  const [squadInfo, setSquadInfo] = useState(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pinnedVote, setPinnedVote] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchIndex, setSearchIndex] = useState(0);
  const [contextMenuMsgId, setContextMenuMsgId] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [reactToMsgId, setReactToMsgId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [recordingLocked, setRecordingLocked] = useState(false);
  const [recordingCancel, setRecordingCancel] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showFormatToolbar, setShowFormatToolbar] = useState(false);

  const isAdminRole = userRole === 'president' || userRole === 'vice_president';
  const lastTap = useRef(0);

  // Background style — default to neon gaming icons wallpaper
  const bgStyle = squadInfo?.chatBackground === 'color'
    ? { backgroundColor: squadInfo.chatBackgroundValue }
    : squadInfo?.chatBackground === 'image'
      ? { backgroundImage: `url(${squadInfo.chatBackgroundValue})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundImage: 'url(/backgrounds/static/bg_1.png)', backgroundSize: 'cover', backgroundPosition: 'center' };

  // Load squad info
  useEffect(() => {
    if (!squadId) return;
    const unsub = onSnapshot(doc(db, 'squads', squadId), (snap) => {
      if (snap.exists()) setSquadInfo({ id: snap.id, ...snap.data() });
    });
    return () => unsub();
  }, [squadId]);

  // Load user role
  useEffect(() => {
    if (!squadId || !auth.currentUser) return;
    const memberRef = doc(db, 'squads', squadId, 'members', auth.currentUser.uid);
    const unsub = onSnapshot(memberRef, (snap) => {
      if (snap.exists()) setUserRole(snap.data().role);
      else setUserRole(null);
    });
    return () => unsub();
  }, [squadId]);

  // Load messages
  useEffect(() => {
    const q = query(collection(db, 'squads', squadId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      // Mark as read
      msgs.forEach(m => {
        if (!m.readBy?.includes(auth.currentUser?.uid)) {
          updateDoc(doc(db, 'squads', squadId, 'messages', m.id), {
            readBy: arrayUnion(auth.currentUser?.uid)
          });
        }
      });
      // New messages badge
      const container = containerRef.current;
      if (container && container.scrollHeight - container.scrollTop - container.clientHeight > 100) {
        setNewMessagesCount(prev => prev + 1);
      }
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return () => unsub();
  }, [squadId]);

  // Load pinned votes (active kick votes)
  useEffect(() => {
    if (!squadId) return;
    const q = query(
      collection(db, 'squads', squadId, 'pinned'),
      where('type', '==', 'vote'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const votes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const now = new Date();
      const activeVotes = votes.filter(v => !v.expiresAt || v.expiresAt.toDate() > now);
      setPinnedVote(activeVotes[0] || null);
    });
    return () => unsub();
  }, [squadId]);

  // Auto-scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 120);
      setNewMessagesCount(0);
    }
    setShowScrollButton(!isNearBottom);
  }, [messages.length]);

  // Send message
  const sendMsg = async (payload) => {
    if (!auth.currentUser) return;
    const msgData = {
      ...payload,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'Anonymous',
      senderAvatar: auth.currentUser.photoURL || '',
      createdAt: serverTimestamp(),
      readBy: [auth.currentUser.uid],
      reactions: {}
    };
    if (replyTo) {
      msgData.replyTo = {
        id: replyTo.id,
        text: (replyTo.text || '').slice(0, 100),
        senderName: replyTo.senderName,
        senderId: replyTo.senderId
      };
    }
    if (editingMsg) {
      await updateDoc(doc(db, 'squads', squadId, 'messages', editingMsg.id), {
        text: input.trim(),
        editedAt: serverTimestamp()
      });
      setEditingMsg(null);
      setInput('');
      return;
    }
    await addDoc(collection(db, 'squads', squadId, 'messages'), msgData);
    setReplyTo(null);
    clearTyping();
  };

  // Rich text formatting
  const applyFormat = (format) => {
    const textarea = inputRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);
    let formatted = '';
    switch (format) {
      case 'bold': formatted = `**${selectedText}**`; break;
      case 'italic': formatted = `_${selectedText}_`; break;
      case 'code': formatted = `\`${selectedText}\``; break;
      case 'spoiler': formatted = `||${selectedText}||`; break;
      default: return;
    }
    const newInput = input.substring(0, start) + formatted + input.substring(end);
    setInput(newInput);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 0);
  };

  // Reactions
  const addReaction = async (msgId, emoji) => {
    const msgRef = doc(db, 'squads', squadId, 'messages', msgId);
    const currentUser = auth.currentUser.uid;
    await updateDoc(msgRef, {
      [`reactions.${currentUser}`]: emoji
    });
  };

  const removeReaction = async (msgId) => {
    const msgRef = doc(db, 'squads', squadId, 'messages', msgId);
    const currentUser = auth.currentUser.uid;
    await updateDoc(msgRef, {
      [`reactions.${currentUser}`]: deleteField()
    });
  };

  const handleReact = (msg) => {
    setReactToMsgId(msg.id);
  };

  const handleReactionSelect = (emoji) => {
    if (reactToMsgId) {
      addReaction(reactToMsgId, emoji);
      setReactToMsgId(null);
    }
  };

  // Message selection
  const toggleMessageSelection = (msgId) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(msgId)) newSet.delete(msgId);
      else newSet.add(msgId);
      if (newSet.size === 0) setSelectionMode(false);
      return newSet;
    });
  };

  const enterSelectionMode = (msgId) => {
    setSelectionMode(true);
    setSelectedMessages(new Set([msgId]));
  };

  const deleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedMessages.size} message(s)?`)) return;
    const batch = writeBatch(db);
    for (const id of selectedMessages) {
      batch.delete(doc(db, 'squads', squadId, 'messages', id));
    }
    await batch.commit();
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const forwardSelected = () => {
    const selectedMsgs = messages.filter(m => selectedMessages.has(m.id));
    setForwardMsg(selectedMsgs);
    setSelectionMode(false);
  };

  // Handle /vote command
  const handleVoteCommand = async () => {
    if (!squadInfo || !squadInfo.memberCount) return;
    const userId = auth.currentUser.uid;
    const intentRef = doc(db, 'squads', squadId, 'vote_intents', userId);
    await setDoc(intentRef, { timestamp: serverTimestamp() }, { merge: true });
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const q = query(collection(db, 'squads', squadId, 'vote_intents'), where('timestamp', '>', twelveHoursAgo));
    const snap = await getDocs(q);
    const intentCount = snap.size;
    const halfMembers = Math.ceil(squadInfo.memberCount / 2);
    if (intentCount >= halfMembers) {
      try {
        await createSquadVote(squadId, userId, {
          title: 'Election for President',
          type: 'elect_role',
          options: ['Yes', 'No'],
          targetUserId: null,
          targetRole: 'president',
          duration: 48,
        });
        await sendMsg({ type: 'text', text: '🚨 A vote for President has been triggered by members! 🚨' });
      } catch (err) {
        console.error('Failed to start vote:', err);
      }
    }
  };

  const handleMediaSelect = (type, url) => {
    if (type === 'gifs') sendMsg({ type: 'gif', contentUrl: url });
    else if (type === 'stickers') sendMsg({ type: 'sticker', contentUrl: url });
    else if (type === 'clips') sendMsg({ type: 'clip', contentUrl: url });
    else if (type === 'memes') sendMsg({ type: 'meme', contentUrl: url });
    setShowMedia(null);
  };

  const handleVoiceStop = async (rec) => {
    setIsRecording(false);
    setRecordingLocked(false);
    setRecordingCancel(false);
    const audioBlob = await rec.stop().getBlob();
    if (!recordingCancel && audioBlob.size > 0) {
      const url = await uploadMediaFile(audioBlob, 'squad_voice');
      sendMsg({ type: 'voice', contentUrl: url });
    }
    setRecorder(null);
  };

  const deleteMsg = async (msgId) => {
    const canDelete = userRole === 'president' || userRole === 'vice_president' || (messages.find(m => m.id === msgId)?.senderId === auth.currentUser?.uid);
    if (!canDelete) return;
    await deleteDoc(doc(db, 'squads', squadId, 'messages', msgId));
  };

  const handlePollVote = async (msgId, optionIndex) => {
    const msgRef = doc(db, 'squads', squadId, 'messages', msgId);
    await updateDoc(msgRef, {
      [`pollData.votes.${optionIndex}`]: serverTimestamp(),
      'pollData.voters': arrayUnion(auth.currentUser.uid)
    });
  };

  const sendPoll = () => {
    if (!pollTitle.trim()) {
      alert('Please enter a title');
      return;
    }
    const options = pollOptions.filter(opt => opt.trim());
    if (options.length < 2) {
      alert('At least two options required');
      return;
    }
    const pollData = {
      title: pollTitle.trim(),
      options: options,
      votes: {},
      totalVotes: 0,
      voters: [],
      createdAt: serverTimestamp(),
    };
    sendMsg({ type: 'poll', pollData });
    setShowPollModal(false);
    setPollTitle('');
    setPollOptions(['', '']);
  };

  // Context menu actions
  const handleReply = (msg) => {
    const senderName = msg.senderId === auth.currentUser?.uid ? 'You' : msg.senderName || 'User';
    setReplyTo({ id: msg.id, text: msg.text || (msg.type === 'image' ? '📷 Photo' : 'Media'), senderName, senderId: msg.senderId });
    setEditingMsg(null);
    inputRef.current?.focus();
    setContextMenuMsgId(null);
  };

  const handleEdit = (msg) => {
    if (msg.senderId !== auth.currentUser?.uid || msg.type !== 'text') return;
    setEditingMsg({ id: msg.id, text: msg.text });
    setInput(msg.text || '');
    setReplyTo(null);
    inputRef.current?.focus();
    setContextMenuMsgId(null);
  };

  const handlePin = async (msg) => {
    const isPinned = msg.pinned;
    await updateDoc(doc(db, 'squads', squadId, 'messages', msg.id), {
      pinned: !isPinned
    });
    if (!isPinned) {
      await updateDoc(doc(db, 'squads', squadId), {
        pinnedMessageId: msg.id
      });
    } else {
      await updateDoc(doc(db, 'squads', squadId), {
        pinnedMessageId: null
      });
    }
    setContextMenuMsgId(null);
  };

  const handleForward = (msg) => {
    setForwardMsg([msg]);
    setContextMenuMsgId(null);
  };

  // Double‑tap reaction (mobile only)
  const handleDoubleTap = (msgId) => {
    if (isMobile) {
      addReaction(msgId, '👍');
    }
  };

  // Voice recording gesture
  const startVoiceRecordingWithGesture = async (e) => {
    e.preventDefault();
    setIsRecording(true);
    setRecordingLocked(false);
    setRecordingCancel(false);
    const rec = await startVoiceRecording();
    setRecorder(rec);
  };

  const handleVoiceMove = (e) => {
    if (!isRecording) return;
    const touch = e.touches[0];
    const moveY = touch.clientY - (e.target.getBoundingClientRect().y + 50);
    const moveX = touch.clientX - (e.target.getBoundingClientRect().x + 25);
    if (moveY < -50 && !recordingLocked) setRecordingLocked(true);
    if (moveX < -100 && !recordingCancel) setRecordingCancel(true);
  };

  const handleVoiceEnd = async () => {
    if (!isRecording) return;
    if (recordingCancel) {
      if (recorder) await recorder.stop();
      setIsRecording(false);
      setRecordingLocked(false);
      setRecordingCancel(false);
      setRecorder(null);
      return;
    }
    if (recordingLocked) return; // wait for "Send" button
    await handleVoiceStop(recorder);
  };

  // Render message content
  const renderMessageContent = (m, isMe) => {
    const time = formatTime(m.createdAt);
    const isEdited = !!m.editedAt;

    if (m.type === 'vote') {
      return <VotePollCard squadId={squadId} voteId={m.voteId} isMe={isMe} />;
    }
    if (m.type === 'poll') {
      return <SquadPollComponent pollData={m.pollData} onVote={(index) => handlePollVote(m.id, index)} />;
    }
    const ytId = m.type === 'text' ? getYouTubeID(m.text) : null;
    if (m.type === 'gif' || m.type === 'giphy') return <img src={m.contentUrl} alt="gif" className="rounded-xl max-w-[200px]" />;
    if (m.type === 'sticker') return <img src={m.contentUrl} alt="sticker" className="w-32 h-32 object-contain" />;
    if (m.type === 'meme') return <img src={m.contentUrl} alt="meme" className="rounded-xl max-w-[250px]" />;
    if (m.type === 'clip') return <video src={m.contentUrl} controls loop className="rounded-xl max-w-[250px]" />;
    if (m.type === 'image') return <img src={m.contentUrl} alt="upload" className="rounded-xl max-w-[250px]" />;
    if (m.type === 'video') return <video src={m.contentUrl} controls className="rounded-xl max-w-[250px]" />;
    if (m.type === 'voice') return <AudioPlayer url={m.contentUrl} isMe={isMe} />;
    if (m.type === 'audio') return <AudioPlayer url={m.contentUrl} isMe={isMe} label={m.fileName} />;
    if (m.type === 'file') {
      return (
        <a href={m.contentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 py-2 hover:opacity-80 transition-opacity min-w-[200px]">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isMe ? 'bg-white/15' : 'bg-brand-cyan/10'}`}><Icon name="description" size={18} className={isMe ? 'text-white/70' : 'text-brand-cyan'} /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{m.fileName || m.text || 'File'}</p>{m.fileSize && <p className={`text-[10px] ${isMe ? 'text-white/50' : 'text-text-muted'}`}>{m.fileSize < 1048576 ? `${(m.fileSize / 1024).toFixed(1)} KB` : `${(m.fileSize / 1048576).toFixed(1)} MB`}</p>}</div>
          <Icon name="download" size={16} className={isMe ? 'text-white/40' : 'text-text-muted'} />
        </a>
      );
    }
    // Text message
    const linkUrl = extractUrl(m.text);
    const processedText = processSpoilers(m.text);
    return (
      <div>
        <QuotedReply replyTo={m.replyTo} isMe={isMe} />
        <div className="inline">
          <ReactMarkdown components={MarkdownComponents}>
            {processedText}
          </ReactMarkdown>
        </div>
        <div className="inline-flex items-center gap-1 float-right ml-2">
          {isEdited && <span className="text-[9px] text-white/40 italic">edited</span>}
          <span className="text-[9px] text-white/40">{time}</span>
          <ReadReceipts isMe={isMe} readBy={m.readBy} senderId={m.senderId} memberCount={squadInfo?.memberCount} />
        </div>
      </div>
    );
  };

  // Menu items
  const baseMenu = [
    { icon: 'info', label: 'Squad Info', path: `/squads/${squadId}` },
    { icon: 'group', label: 'Members', path: `/squads/${squadId}/members` },
    { icon: 'leaderboard', label: 'Leaderboard', path: `/squads/${squadId}/leaderboard` },
    { icon: 'campaign', label: 'Announcements', path: `/squads/${squadId}/announcements` },
    { icon: 'photo_library', label: 'Media', path: `/squads/${squadId}/media` },
    { icon: 'push_pin', label: 'Pinned', path: `/squads/${squadId}/pinned` },
    { icon: 'event', label: 'Events', path: `/squads/${squadId}/events` },
    { icon: 'emoji_events', label: 'Challenges', path: `/squads/${squadId}/challenges` },
  ];
  const adminMenu = [
    { icon: 'settings', label: 'Settings', path: `/squads/${squadId}/settings` },
    { icon: 'how_to_vote', label: 'Roles', path: `/squads/${squadId}/roles` },
    { icon: 'person_add', label: 'Join Requests', path: `/squads/${squadId}/requests` },
    { icon: 'wallpaper', label: 'Chat Background', action: () => setShowBackgroundModal(true) },
  ];
  const headerMenuItems = isAdminRole ? [...baseMenu, ...adminMenu] : baseMenu;

  // Search
  const searchResults = searchQuery ? messages.filter(m => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const scrollToSearchResult = (idx) => {
    const msg = searchResults[idx];
    if (msg) {
      const el = document.getElementById(`msg-${msg.id}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-brand-cyan/50'); setTimeout(() => el.classList.remove('ring-2', 'ring-brand-cyan/50'), 2000); }
    }
  };

  // Scroll to pinned
  const scrollToVote = () => {
    if (!pinnedVote) return;
    const element = document.querySelector(`[data-message-id="${pinnedVote.messageId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-brand-cyan');
      setTimeout(() => element.classList.remove('ring-2', 'ring-brand-cyan'), 2000);
    } else {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const pinnedMessage = messages.find(m => m.pinned === true);
  const scrollToPinned = () => {
    if (pinnedMessage) {
      const el = document.getElementById(`msg-${pinnedMessage.id}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-brand-cyan/50'); setTimeout(() => el.classList.remove('ring-2', 'ring-brand-cyan/50'), 2000); }
    }
  };

  // Long press
  const longPressTimer = useRef(null);
  const handleMsgLongPress = (msgId) => {
    longPressTimer.current = setTimeout(() => enterSelectionMode(msgId), 400);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  // Swipe for reply
  const swipeRef = useRef({ startX: 0, startY: 0, msgId: null, swiping: false, el: null });
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
      const senderName = sw.msg.senderId === auth.currentUser?.uid ? 'You' : sw.msg.senderName || 'User';
      setReplyTo({ id: sw.msg.id, text: sw.msg.text || 'Media', senderName, senderId: sw.msg.senderId });
      inputRef.current?.focus();
    }
    swipeRef.current = { startX: 0, startY: 0, msgId: null, swiping: false };
  };

  return (
    <div className="flex flex-col h-full text-white">
      {/* Header */}
      <div className="relative z-20 glass-header">
        {isMobile ? (
          <TopBar
            showBack
            title={squadInfo?.name || 'Squad Chat'}
            actions={
              <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-1.5">
                <Icon name="more_vert" size={20} />
              </button>
            }
          />
        ) : (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
            <button onClick={() => navigate(-1)} className="shrink-0"><Icon name="arrow_back" size={24} /></button>
            <div className="relative shrink-0 cursor-pointer" onClick={() => navigate(`/squads/${squadId}`)}>
              <UserAvatar src={squadInfo?.avatar} size={40} />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer group" onClick={() => navigate(`/squads/${squadId}`)}>
              <h2 className="text-white font-bold text-sm truncate group-hover:text-brand-cyan transition-colors">{squadInfo?.name || 'Squad Chat'}</h2>
              <p className="text-[10px] font-bold uppercase tracking-tighter text-text-muted">{squadInfo?.memberCount || 0} members</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowSearch(s => !s)} className="text-text-muted hover:text-white transition-colors p-1.5"><Icon name="search" size={20} /></button>
              <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="text-text-muted hover:text-white transition-colors p-1.5"><Icon name="more_vert" size={20} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Header dropdown */}
      {showHeaderMenu && <div className="fixed inset-0 z-30" onClick={() => setShowHeaderMenu(false)} />}
      {showHeaderMenu && (
        <div className="absolute right-4 top-14 z-40 w-52 bg-surface-1 border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
          {headerMenuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => { if (item.action) item.action(); else navigate(item.path); setShowHeaderMenu(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2 transition-colors ${i > 0 ? 'border-t border-white/[0.03]' : ''}`}
            >
              <Icon name={item.icon} size={18} className="text-text-secondary" />
              <span className="text-sm text-text-primary">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border-b border-white/[0.04] animate-slide-down">
          <Icon name="search" size={18} className="text-text-muted shrink-0" />
          <input autoFocus value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchIndex(0); }} placeholder="Search in chat..." className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-text-muted/60" />
          {searchQuery && searchResults.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-text-muted">{searchIndex + 1}/{searchResults.length}</span>
              <button onClick={() => { const next = (searchIndex - 1 + searchResults.length) % searchResults.length; setSearchIndex(next); scrollToSearchResult(next); }} className="text-text-muted hover:text-white p-0.5"><Icon name="keyboard_arrow_up" size={18} /></button>
              <button onClick={() => { const next = (searchIndex + 1) % searchResults.length; setSearchIndex(next); scrollToSearchResult(next); }} className="text-text-muted hover:text-white p-0.5"><Icon name="keyboard_arrow_down" size={18} /></button>
            </div>
          )}
          {searchQuery && searchResults.length === 0 && <span className="text-[10px] text-text-muted shrink-0">No results</span>}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="text-text-muted hover:text-white"><Icon name="close" size={18} /></button>
        </div>
      )}

      {/* Pinned message bar */}
      {pinnedMessage && (
        <div className="flex items-center gap-2 px-4 py-2 bg-surface-2/80 border-b border-white/[0.03] cursor-pointer hover:bg-surface-2 transition-colors" onClick={scrollToPinned}>
          <Icon name="push_pin" size={16} className="text-brand-cyan shrink-0" />
          <div className="flex-1 min-w-0"><p className="text-[10px] text-brand-cyan font-bold">Pinned Message</p><p className="text-xs text-text-muted truncate">{pinnedMessage.text || 'Media'}</p></div>
        </div>
      )}

      {/* Active kick vote bar */}
      {pinnedVote && (
        <div onClick={scrollToVote} className="flex items-center gap-2 px-4 py-2 bg-red-950/60 border-b border-red-500/30 cursor-pointer hover:bg-red-950/80 transition-colors">
          <Icon name="push_pin" size={16} className="text-red-400" />
          <span className="text-xs font-semibold text-white/90 flex-1 truncate">Active kick vote: {pinnedVote.title}</span>
          <Icon name="arrow_downward" size={16} className="text-red-400" />
        </div>
      )}

      {/* Messages container */}
      <main ref={containerRef} className="flex-1 overflow-y-auto no-scrollbar relative" style={bgStyle}>
        {squadInfo?.chatBackground === 'image' && <div className="absolute inset-0 bg-bg-dark/60 pointer-events-none" />}
        <div className="relative p-4 space-y-1 min-h-full flex flex-col justify-end">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const isMe = m.senderId === auth.currentUser?.uid;
              const isHighlighted = searchQuery && m.text?.toLowerCase().includes(searchQuery.toLowerCase());
              const showAvatar = i === 0 || messages[i-1].senderId !== m.senderId;
              const isSelected = selectedMessages.has(m.id);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''} ${isHighlighted ? 'bg-brand-cyan/5 -mx-2 px-2 rounded-lg' : ''} ${isSelected ? 'bg-brand-cyan/10 rounded-lg' : ''}`}
                  onDoubleClick={() => handleDoubleTap(m.id)}
                >
                  {!isMe && showAvatar && <img src={m.senderAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${m.senderId}`} className="w-8 h-8 rounded-full bg-surface-2" />}
                  {!isMe && !showAvatar && <div className="w-8" />}
                  <div
                    className={`group relative max-w-[80%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenuMsgId(prev => prev === m.id ? null : m.id); }}
                    onTouchStart={(e) => { if (!selectionMode) handleSwipeStart(e, m); }}
                    onTouchMove={(e) => { if (!selectionMode) handleSwipeMove(e); }}
                    onTouchEnd={() => { if (!selectionMode) handleSwipeEnd(); }}
                    onMouseDown={() => { if (!selectionMode) handleMsgLongPress(m.id); else toggleMessageSelection(m.id); }}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    onClick={() => { if (selectionMode) toggleMessageSelection(m.id); }}
                  >
                    <div
                      className={`px-3 py-2 rounded-2xl ${isMe ? 'text-white rounded-tr-none' : 'bg-surface-2 text-white rounded-tl-none border border-white/[0.06]'}`}
                      style={isMe ? { background: '#1a6b5a' } : undefined}
                    >
                      {renderMessageContent(m, isMe)}
                    </div>
                    {m.reactions && Object.keys(m.reactions).length > 0 && (
                      <ReactionBubbles
                        reactions={m.reactions}
                        chatId={squadId}
                        messageId={m.id}
                        isMe={isMe}
                        type="squad"
                        onReact={() => handleReact(m)}
                      />
                    )}
                    {contextMenuMsgId === m.id && (
                      <MessageContextMenu
                        chatId={squadId}
                        messageId={m.id}
                        message={m}
                        isMe={isMe}
                        onClose={() => setContextMenuMsgId(null)}
                        onReply={() => handleReply(m)}
                        onEdit={() => handleEdit(m)}
                        onPin={() => handlePin(m)}
                        onForward={() => handleForward(m)}
                        onDelete={() => deleteMsg(m.id)}
                        onReact={() => handleReact(m)}
                        type="squad"
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="flex justify-start">
              <div className="flex gap-2 items-end">
                <div className="w-8 shrink-0"><UserAvatar user={typingUsers[0]} size="xs" /></div>
                <TypingIndicator />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Floating scroll button */}
      {showScrollButton && (
        <button
          onClick={() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' })}
          className="fixed bottom-20 right-4 z-50 w-9 h-9 rounded-full bg-surface-1 border border-white/[0.06] text-text-secondary flex items-center justify-center hover:text-text-primary active:scale-95 transition-all animate-fade-in"
        >
          {newMessagesCount > 0 ? (
            <div className="relative">
              <Icon name="arrow_downward" size={24} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{newMessagesCount > 9 ? '9+' : newMessagesCount}</span>
            </div>
          ) : (
            <Icon name="arrow_downward" size={24} />
          )}
        </button>
      )}

      {/* Selection mode toolbar (top) */}
      {selectionMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-surface-1 border-b border-white/[0.04] py-2 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { setSelectionMode(false); setSelectedMessages(new Set()); }}><Icon name="close" size={20} className="text-text-muted" /></button>
            <span className="text-sm font-semibold text-white">{selectedMessages.size}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={forwardSelected}><Icon name="forward" size={20} className="text-brand-cyan" /></button>
            <button onClick={deleteSelected}><Icon name="delete" size={20} className="text-brand-ember" /></button>
          </div>
        </div>
      )}

      {/* Media panel */}
      {showMedia && <MediaPanel defaultTab={showMedia} onSelect={handleMediaSelect} onClose={() => setShowMedia(null)} />}

      {/* Emoji picker for input */}
      {showEmoji && !reactToMsgId && <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} onClose={() => setShowEmoji(false)} />}

      {/* Emoji picker for reactions */}
      {reactToMsgId && <EmojiPicker onSelect={handleReactionSelect} onClose={() => setReactToMsgId(null)} />}

      {/* Reply / edit bar */}
      {(replyTo || editingMsg) && (
        <div className="flex items-center gap-3 px-4 py-2 bg-surface-2/80 border-t border-white/[0.03]">
          <div className={`w-1 h-8 rounded-full ${editingMsg ? 'bg-brand-gold' : 'bg-brand-cyan'}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-bold ${editingMsg ? 'text-brand-gold' : 'text-brand-cyan'}`}>{editingMsg ? 'Editing' : `Reply to ${replyTo?.senderName}`}</p>
            <p className="text-xs text-text-muted truncate">{editingMsg?.text || replyTo?.text}</p>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }} className="text-text-muted hover:text-white shrink-0"><Icon name="close" size={18} /></button>
        </div>
      )}

      {/* Input footer */}
      <div className="p-4 bg-surface-1/50 backdrop-blur-xl border-t border-white/[0.04]">
        {/* Format toolbar toggle */}
        <div className="flex items-center justify-between mb-2 px-2">
          <button onClick={() => setShowFormatToolbar(!showFormatToolbar)} className="p-1 rounded-lg hover:bg-white/10">
            <Icon name="format_bold" size={18} className="text-text-muted" />
          </button>
          <button onClick={() => setShowPollModal(true)} className="p-1 rounded-lg hover:bg-white/10">
            <Icon name="poll" size={18} className="text-text-muted" />
          </button>
        </div>
        {showFormatToolbar && (
          <div className="flex items-center gap-1 mb-2 px-2">
            <button onClick={() => applyFormat('bold')} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="format_bold" size={18} className="text-text-muted" /></button>
            <button onClick={() => applyFormat('italic')} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="format_italic" size={18} className="text-text-muted" /></button>
            <button onClick={() => applyFormat('code')} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="code" size={18} className="text-text-muted" /></button>
            <button onClick={() => applyFormat('spoiler')} className="p-1.5 rounded-lg hover:bg-white/10"><Icon name="visibility_off" size={18} className="text-text-muted" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <>
              <button onClick={() => setShowMedia(showMedia ? null : 'gifs')} className={`p-2 rounded-full ${showMedia ? 'text-brand-cyan' : 'text-text-muted'}`}><Icon name="gif_box" size={24} /></button>
              <button onClick={() => { setShowEmoji(!showEmoji); if (showMedia) setShowMedia(null); }} className="p-2"><Icon name="sentiment_satisfied" size={22} className={showEmoji ? 'text-brand-cyan' : 'text-text-muted'} /></button>
              <div className="flex-1 bg-surface-2 rounded-full px-4 py-2 flex items-center border border-white/[0.04] focus-within:border-brand-cyan/50 transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const trimmed = input.trim();
                      if (trimmed === '/vote') {
                        await handleVoteCommand();
                        setInput('');
                      } else if (trimmed) {
                        sendMsg({ text: trimmed, type: 'text' });
                        setInput('');
                      }
                    }
                  }}
                  placeholder={editingMsg ? 'Edit message...' : 'Type a message...'}
                  className="flex-1 bg-transparent outline-none text-sm"
                />
                <input type="file" id="img-up" accept="image/*" hidden onChange={async e => {
                  if (!e.target.files[0]) return;
                  const file = e.target.files[0]; e.target.value = '';
                  const sizeCheck = checkFileSize(file.size);
                  if (!sizeCheck.allowed) { setUpgradeModal({ open: true, requiredTier: sizeCheck.requiredTier, message: sizeCheck.message }); return; }
                  const url = await uploadMediaFile(file, 'squad_images', tier, tierConfig.mediaRetentionDays);
                  sendMsg({ type: 'image', contentUrl: url });
                }} />
                <label htmlFor="img-up" className="cursor-pointer"><Icon name="image" size={20} className="text-text-muted ml-2" /></label>
                <input type="file" id="vid-up" accept="video/*" hidden onChange={async e => {
                  if (!e.target.files[0]) return;
                  const file = e.target.files[0]; e.target.value = '';
                  const sizeCheck = checkFileSize(file.size);
                  if (!sizeCheck.allowed) { setUpgradeModal({ open: true, requiredTier: sizeCheck.requiredTier, message: sizeCheck.message }); return; }
                  const url = await uploadMediaFile(file, 'squad_videos', tier, tierConfig.mediaRetentionDays);
                  sendMsg({ type: 'video', contentUrl: url });
                }} />
                <label htmlFor="vid-up" className="cursor-pointer"><Icon name="videocam" size={20} className="text-text-muted ml-2" /></label>
              </div>
              {input.trim() ? (
                <button onClick={() => { sendMsg({ text: input, type: 'text' }); setInput(''); }} className="bg-brand-cyan p-2.5 rounded-full text-bg-dark"><Icon name="send" size={18} /></button>
              ) : (
                <button
                  onMouseDown={startVoiceRecordingWithGesture}
                  onMouseMove={handleVoiceMove}
                  onMouseUp={handleVoiceEnd}
                  onTouchStart={startVoiceRecordingWithGesture}
                  onTouchMove={handleVoiceMove}
                  onTouchEnd={handleVoiceEnd}
                  className="bg-surface-2 p-2.5 rounded-full text-white active:bg-brand-cyan active:text-bg-dark transition-all duration-200"
                >
                  <Icon name="mic" size={18} />
                </button>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center gap-4 bg-red-500/10 rounded-full px-5 py-2 border border-red-500/30">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-brand-cyan text-sm font-bold flex-1">{recordingLocked ? '🔒 Recording locked' : recordingCancel ? '✖️ Cancel' : '🎤 Recording...'}</span>
              {!recordingLocked && <button onClick={() => setRecordingCancel(true)} className="text-red-500 text-xs font-bold">Cancel</button>}
              {recordingLocked && <button onClick={handleVoiceEnd} className="text-green-500 text-xs font-bold">Send</button>}
            </div>
          )}
        </div>
      </div>

      {/* Poll modal */}
      <Modal isOpen={showPollModal} onClose={() => setShowPollModal(false)} title="Create a Poll">
        <div className="space-y-4">
          <input type="text" value={pollTitle} onChange={(e) => setPollTitle(e.target.value)} placeholder="Poll question" className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3 text-sm text-text-primary focus:border-brand-cyan focus:outline-none" />
          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <input key={idx} type="text" value={opt} onChange={(e) => { const newOpts = [...pollOptions]; newOpts[idx] = e.target.value; setPollOptions(newOpts); }} placeholder={`Option ${idx + 1}`} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3 text-sm text-text-primary focus:border-brand-cyan focus:outline-none" />
            ))}
            <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-brand-cyan text-sm font-semibold flex items-center gap-1"><Icon name="add" size={16} /> Add option</button>
          </div>
          <button onClick={sendPoll} className="w-full py-3 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm">Create Poll</button>
        </div>
      </Modal>

      <UpgradeModal isOpen={upgradeModal.open} onClose={() => setUpgradeModal({ open: false, requiredTier: 'lite', message: '' })} requiredTier={upgradeModal.requiredTier} message={upgradeModal.message} />
      {forwardMsg && <ForwardModal messages={forwardMsg} onClose={() => setForwardMsg(null)} />}
      <BackgroundPickerModal isOpen={showBackgroundModal} onClose={() => setShowBackgroundModal(false)} squadId={squadId} currentBackground={squadInfo?.chatBackground} currentValue={squadInfo?.chatBackgroundValue} />
    </div>
  );
}