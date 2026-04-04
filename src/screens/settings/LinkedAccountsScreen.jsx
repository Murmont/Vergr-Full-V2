import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { updateLinkedAccount, removeLinkedAccount } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const PLATFORMS = [
  { id: 'twitch', name: 'Twitch', icon: '📺', color: '#9146FF', placeholder: 'Your Twitch username', desc: 'Stream directly and show your Twitch status' },
  { id: 'discord', name: 'Discord', icon: '💬', color: '#5865F2', placeholder: 'Username#1234', desc: 'Let squad members find you on Discord' },
  { id: 'youtube', name: 'YouTube', icon: '▶️', color: '#FF0000', placeholder: 'Your YouTube channel name', desc: 'Link your channel and share videos' },
  { id: 'steam', name: 'Steam', icon: '🎮', color: '#1B2838', placeholder: 'Your Steam profile name', desc: 'Display your Steam library and status' },
  { id: 'kick', name: 'Kick', icon: '🟢', color: '#53FC18', placeholder: 'Your Kick username', desc: 'Show your Kick stream status' },
  { id: 'xbox', name: 'Xbox', icon: '🟩', color: '#107C10', placeholder: 'Your Gamertag', desc: 'Display your Xbox Gamertag on profile' },
  { id: 'playstation', name: 'PlayStation', icon: '🎮', color: '#003087', placeholder: 'Your PSN ID', desc: 'Display your PlayStation ID on profile' },
  { id: 'epicgames', name: 'Epic Games', icon: '🎯', color: '#313131', placeholder: 'Your Epic display name', desc: 'Link your Epic Games account' },
  { id: 'riotgames', name: 'Riot Games', icon: '⚔️', color: '#D32936', placeholder: 'Name#TAG', desc: 'Show your Valorant / LoL rank' },
];

export default function LinkedAccountsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [connectModal, setConnectModal] = useState(null); // platform object
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(null);

  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();

  const linkedAccounts = profile?.linkedAccounts || {};

  const handleConnect = async () => {
    if (!inputValue.trim() || !connectModal || saving) return;
    setSaving(true);
    try {
      await updateLinkedAccount(currentUser.uid, connectModal.id, inputValue.trim());
      showToast(`${connectModal.name} connected!`, 'success');
      setConnectModal(null);
      setInputValue('');
    } catch (err) {
      console.error(err);
      showToast('Failed to connect account', 'error');
    }
    setSaving(false);
  };

  const handleDisconnect = async (platform) => {
    setDisconnecting(platform.id);
    try {
      await removeLinkedAccount(currentUser.uid, platform.id);
      showToast(`${platform.name} disconnected`, 'info');
    } catch (err) {
      console.error(err);
      showToast('Failed to disconnect', 'error');
    }
    setDisconnecting(null);
  };

  const connected = PLATFORMS.filter(p => linkedAccounts[p.id]);
  const available = PLATFORMS.filter(p => !linkedAccounts[p.id]);

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Linked Accounts" showBack />
      <div className="px-4 py-4">
        <p className="text-text-secondary text-sm mb-6">
          Connect your gaming accounts to display on your profile and enable cross-platform features.
        </p>

        {connected.length > 0 && (
          <>
            <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">Connected</h3>
            <div className="space-y-2 mb-6">
              {connected.map(platform => (
                <div key={platform.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{platform.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{platform.name}</p>
                      <p className="text-xs text-green-500 font-dmmono">{linkedAccounts[platform.id]}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setConnectModal(platform); setInputValue(linkedAccounts[platform.id] || ''); }}
                      className="px-3 py-1.5 rounded-full border border-white/[0.06] text-text-secondary text-xs font-semibold hover:bg-surface-2 transition-colors">
                      Edit
                    </button>
                    <button
                      onClick={() => handleDisconnect(platform)}
                      disabled={disconnecting === platform.id}
                      className="px-3 py-1.5 rounded-full border border-brand-ember/30 text-brand-ember text-xs font-semibold hover:bg-brand-ember/5 transition-colors">
                      {disconnecting === platform.id ? '...' : 'Disconnect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <h3 className="text-text-muted text-xs font-semibold uppercase tracking-wider mb-3">
          {connected.length > 0 ? 'Available' : 'Connect your accounts'}
        </h3>
        <div className="space-y-2">
          {available.map(platform => (
            <div key={platform.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl shrink-0">{platform.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{platform.name}</p>
                  <p className="text-xs text-text-muted truncate">{platform.desc}</p>
                </div>
              </div>
              <button
                onClick={() => { setConnectModal(platform); setInputValue(''); }}
                className="px-4 py-1.5 rounded-full bg-brand-cyan text-bg-dark text-xs font-bold hover:brightness-110 transition-all shrink-0 ml-3">
                Connect
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Connect / Edit Modal */}
      {connectModal && (
        <Modal onClose={() => { setConnectModal(null); setInputValue(''); }}>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{connectModal.icon}</span>
              <div>
                <h2 className="font-syne text-xl font-bold">{connectModal.name}</h2>
                <p className="text-text-muted text-xs">{connectModal.desc}</p>
              </div>
            </div>

            <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">
              Your {connectModal.name} Username / ID
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={connectModal.placeholder}
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setConnectModal(null); setInputValue(''); }}
                className="flex-1 py-3 rounded-xl bg-surface-2 text-text-secondary font-semibold text-sm">
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!inputValue.trim() || saving}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                  inputValue.trim() && !saving
                    ? 'bg-brand-cyan text-bg-dark'
                    : 'bg-surface-3 text-text-muted'
                }`}>
                {saving ? 'Saving...' : linkedAccounts[connectModal.id] ? 'Update' : 'Connect'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
