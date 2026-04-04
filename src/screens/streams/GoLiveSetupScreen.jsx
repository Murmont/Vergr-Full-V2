import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const PLATFORMS = [
  { id: 'twitch', name: 'Twitch', icon: '📺', color: '#9146FF', connected: false, username: '' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000', connected: false },
  { id: 'kick', name: 'Kick', icon: '🟢', color: '#53FC18', connected: false },
  { id: 'vergr', name: 'VERGR Native', icon: '🎮', color: '#4DFFD4', connected: false, username: 'Built-in' },
];

const GAME_OPTIONS = ['Valorant', 'Apex Legends', 'Elden Ring', 'Fortnite', 'League of Legends', 'CS2', 'Overwatch 2', 'Other'];

export default function GoLiveSetupScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [title, setTitle] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(['vergr']);
  const [enableChat, setEnableChat] = useState(true);
  const [enableTips, setEnableTips] = useState(true);
  const { showToast } = useUI();
  const navigate = useNavigate();

  const togglePlatform = (id) => {
    const platform = PLATFORMS.find(p => p.id === id);
    if (!platform.connected && id !== 'vergr') {
      showToast(`Connect ${platform.name} in settings first`, 'info');
      return;
    }
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const goLive = () => {
    if (!title || !selectedGame) {
      showToast('Add a title and select a game', 'error');
      return;
    }
    showToast("You're now LIVE! 🔴", 'success');
    navigate('/');
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Go Live" showBack />

      <div className="px-4 py-4 space-y-6">
        {/* Stream Title */}
        <div>
          <label className="text-text-secondary text-sm mb-2 block">Stream Title</label>
          <input type="text" placeholder="What are you streaming?" value={title} onChange={e => setTitle(e.target.value)}
            className="input-field" maxLength={100} />
          <p className="text-text-muted text-xs text-right mt-1">{title.length}/100</p>
        </div>

        {/* Game Selection */}
        <div>
          <label className="text-text-secondary text-sm mb-2 block">Game</label>
          <div className="flex flex-wrap gap-2">
            {GAME_OPTIONS.map(game => (
              <button key={game} onClick={() => setSelectedGame(game)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedGame === game ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary border border-white/[0.06] hover:border-text-muted'
                }`}>
                {game}
              </button>
            ))}
          </div>
        </div>

        {/* Streaming Platforms */}
        <div>
          <label className="text-text-secondary text-sm mb-2 block">Stream To</label>
          <p className="text-text-muted text-xs mb-3">Multi-stream to linked platforms simultaneously</p>
          <div className="space-y-3">
            {PLATFORMS.map(platform => (
              <button key={platform.id} onClick={() => togglePlatform(platform.id)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                  selectedPlatforms.includes(platform.id)
                    ? 'border-brand-cyan bg-brand-cyan/5'
                    : 'border-white/[0.06] bg-surface-1'
                } ${!platform.connected && platform.id !== 'vergr' ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{platform.icon}</span>
                  <div className="text-left">
                    <span className="text-sm font-semibold text-text-primary">{platform.name}</span>
                    {platform.connected ? (
                      <p className="text-xs text-green-500">Connected{platform.username ? ` · ${platform.username}` : ''}</p>
                    ) : (
                      <p className="text-xs text-text-muted">Not connected</p>
                    )}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedPlatforms.includes(platform.id) ? 'border-brand-cyan bg-brand-cyan' : 'border-white/[0.06]'
                }`}>
                  {selectedPlatforms.includes(platform.id) && <Icon name="check" size={14} className="text-bg-dark" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Icon name="chat" size={22} className="text-brand-cyan" />
              <div>
                <p className="text-sm font-semibold">Live Chat</p>
                <p className="text-xs text-text-muted">Allow viewers to chat</p>
              </div>
            </div>
            <button onClick={() => setEnableChat(!enableChat)}
              className={`w-12 h-7 rounded-full transition-colors ${enableChat ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enableChat ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Icon name="paid" size={22} className="text-brand-gold" />
              <div>
                <p className="text-sm font-semibold">Tips & Donations</p>
                <p className="text-xs text-text-muted">Allow viewers to tip with coins</p>
              </div>
            </div>
            <button onClick={() => setEnableTips(!enableTips)}
              className={`w-12 h-7 rounded-full transition-colors ${enableTips ? 'bg-brand-gold' : 'bg-surface-3'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${enableTips ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Go Live Button */}
        <button onClick={goLive}
          className="w-full h-[56px] rounded-full bg-brand-ember text-white font-bold text-base flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.97] transition-all">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          Go Live
        </button>
      </div>
    </div>
  );
}
