import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const CHAT_MESSAGES = [];

export default function LiveStreamScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState(CHAT_MESSAGES);
  const [isFollowing, setIsFollowing] = useState(false);
  const navigate = useNavigate();

  const send = () => {
    if (!chatInput.trim()) return;
    setMessages(p => [...p, { id: Date.now(), user: 'You', text: chatInput.trim(), color: 'text-brand-cyan' }]);
    setChatInput('');
  };

  return (
    <div className={isDesktop ? "min-h-screen flex flex-col bg-black" : "screen-container min-h-screen flex flex-col bg-black"}>
      {/* Video area */}
      <div className="relative w-full aspect-video bg-gradient-to-br from-surface-1 to-surface-3 flex items-center justify-center">
        <div className="text-center">
          <Icon name="live_tv" size={48} className="text-text-muted mb-2" />
          <p className="text-text-muted text-sm">Stream Preview</p>
        </div>

        {/* Top overlay */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
            <Icon name="arrow_back" size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-brand-ember/90 px-2.5 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white text-[10px] font-bold">LIVE</span>
            </div>
            <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full">
              <Icon name="visibility" size={12} className="text-white/70" />
              <span className="text-white/70 text-[10px] font-dmmono">2.4K</span>
            </div>
          </div>
        </div>

        {/* Streamer info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserAvatar src="" size={36} showTierRing={false} />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-white text-sm font-bold">Streamer</span>
                  <Icon name="verified" filled size={14} className="text-brand-cyan" />
                </div>
                <span className="text-white/60 text-[10px]">Elden Ring DLC Blind Run</span>
              </div>
            </div>
            <button onClick={() => setIsFollowing(!isFollowing)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isFollowing ? 'bg-surface-2/80 text-white' : 'bg-brand-cyan text-bg-dark'
              }`}>
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col bg-bg-dark">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.03]">
          <span className="font-syne text-sm font-bold">Live Chat</span>
          <span className="text-text-muted text-xs font-dmmono">2,412 watching</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {messages.map(msg => (
            <div key={msg.id} className={`text-sm ${msg.isSystem ? 'text-center py-1' : ''}`}>
              {msg.isSystem ? (
                <span className="text-brand-gold bg-brand-gold/5 px-2 py-0.5 rounded text-xs">{msg.text}</span>
              ) : (
                <>
                  <span className={`font-bold ${msg.color}`}>{msg.user}: </span>
                  <span className="text-text-secondary">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Chat input */}
        <div className="p-3 border-t border-white/[0.03] flex items-center gap-2">
          <button className="w-9 h-9 rounded-full bg-brand-gold/10 flex items-center justify-center shrink-0">
            <Icon name="paid" size={18} className="text-brand-gold" />
          </button>
          <input type="text" placeholder="Send a message..." value={chatInput} onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            className="flex-1 bg-surface-2 border border-white/[0.06] rounded-full py-2 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none" />
          <button onClick={send}
            className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${chatInput.trim() ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-muted'}`}>
            <Icon name="send" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
