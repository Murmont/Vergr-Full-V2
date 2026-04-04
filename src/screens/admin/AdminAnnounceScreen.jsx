import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase/config';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';

const AUDIENCES = [
  { id: 'all', label: 'All Users', desc: 'Everyone on VERGR', icon: 'public' },
  { id: 'lite', label: 'Lite Tier', desc: 'Lite subscribers only', icon: 'star_half' },
  { id: 'pro', label: 'Pro Tier', desc: 'Pro subscribers only', icon: 'star' },
  { id: 'paid', label: 'All Paid Users', desc: 'Lite + Pro subscribers', icon: 'workspace_premium' },
];

const TYPES = [
  { id: 'system', label: 'Announcement', icon: 'campaign' },
  { id: 'coins', label: 'Coin Reward', icon: 'paid' },
  { id: 'tournament', label: 'Tournament', icon: 'emoji_events' },
];

export default function AdminAnnounceScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [type, setType] = useState('system');
  const [coinReward, setCoinReward] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  // Admin check
  if (profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen">
        <TopBar showBack title="Admin" />
        <div className="text-center py-20 text-text-muted">Admin access required</div>
      </div>
    );
  }

  const handleSend = async () => {
    if (!title.trim() || sending) return;
    setSending(true);
    try {
      const sendFn = httpsCallable(functions, 'sendAnnouncement');
      const result = await sendFn({
        title: title.trim(),
        body: body.trim(),
        audience,
        type,
        coinReward: type === 'coins' ? parseInt(coinReward) || 0 : 0,
        actionUrl: actionUrl.trim() || null,
      });
      setSent(true);
      showToast(`Sent to ${result.data?.count || 0} users`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send', 'error');
    }
    setSending(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen">
        <TopBar showBack title="Admin Announce" />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-16 h-16 rounded-full bg-brand-cyan/15 flex items-center justify-center mb-4">
            <Icon name="check" size={32} className="text-brand-cyan" />
          </div>
          <h2 className="font-syne text-xl font-bold mb-2">Announcement Sent</h2>
          <p className="text-text-secondary text-sm mb-6">Users will see it in their notifications</p>
          <button onClick={() => { setSent(false); setTitle(''); setBody(''); setCoinReward(''); setActionUrl(''); }}
            className="px-6 py-2.5 rounded-xl bg-surface-2 border border-white/[0.06] text-text-secondary text-sm font-bold hover:text-white transition-colors">
            Send Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <TopBar showBack title="Admin Announce" />

      <div className={`px-4 py-5 space-y-6 ${isDesktop ? 'max-w-2xl' : ''}`}>
        {/* Type */}
        <div>
          <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Type</label>
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                  type === t.id ? 'bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan' : 'bg-surface-2 border border-white/[0.06] text-text-muted'
                }`}>
                <Icon name={t.icon} size={16} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Weekend Tournament This Friday!"
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:border-brand-cyan focus:outline-none" maxLength={100} />
        </div>

        {/* Body */}
        <div>
          <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Details about the announcement..."
            rows={3}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:border-brand-cyan focus:outline-none resize-none" maxLength={500} />
        </div>

        {/* Coin reward */}
        {type === 'coins' && (
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Coin Reward (per user)</label>
            <input type="number" min="0" max="10000" value={coinReward} onChange={e => setCoinReward(e.target.value)}
              placeholder="0"
              className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:border-brand-cyan focus:outline-none font-dmmono" />
            <p className="text-text-muted text-[10px] mt-1.5">Each user receives this many coins. Be careful — this costs real money.</p>
          </div>
        )}

        {/* Audience */}
        <div>
          <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Audience</label>
          <div className="space-y-2">
            {AUDIENCES.map(a => (
              <button key={a.id} onClick={() => setAudience(a.id)}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                  audience === a.id ? 'border-brand-violet bg-brand-violet/5' : 'border-white/[0.06] bg-surface-1 hover:border-white/10'
                }`}>
                <Icon name={a.icon} size={20} className={audience === a.id ? 'text-brand-violet' : 'text-text-muted'} />
                <div className="flex-1">
                  <p className="text-text-primary text-sm font-bold">{a.label}</p>
                  <p className="text-text-muted text-[10px]">{a.desc}</p>
                </div>
                {audience === a.id && <Icon name="check_circle" size={20} className="text-brand-violet" />}
              </button>
            ))}
          </div>
        </div>

        {/* Action URL */}
        <div>
          <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Link (optional)</label>
          <input type="text" value={actionUrl} onChange={e => setActionUrl(e.target.value)}
            placeholder="/tournaments or /wallet"
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl p-3.5 text-text-primary text-sm placeholder:text-text-muted/60 focus:border-brand-cyan focus:outline-none font-dmmono" />
          <p className="text-text-muted text-[10px] mt-1.5">Users tap "View" in the notification to go here</p>
        </div>

        {/* Preview */}
        {title.trim() && (
          <div>
            <label className="text-text-secondary text-[10px] uppercase tracking-widest font-bold mb-2.5 block">Preview</label>
            <div className="p-4 rounded-xl bg-brand-cyan/5 border border-brand-cyan/20 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-cyan/15 flex items-center justify-center shrink-0">
                <Icon name={TYPES.find(t => t.id === type)?.icon || 'campaign'} size={18} className="text-brand-cyan" />
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{title}</p>
                {body && <p className="text-text-secondary text-xs mt-0.5">{body}</p>}
                {type === 'coins' && coinReward && <p className="text-brand-gold text-xs font-dmmono mt-1">+{coinReward} coins</p>}
              </div>
            </div>
          </div>
        )}

        {/* Send */}
        <button onClick={handleSend} disabled={!title.trim() || sending}
          className="w-full py-4 rounded-2xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all  disabled:opacity-30">
          {sending ? 'Sending...' : `Send to ${AUDIENCES.find(a => a.id === audience)?.label || 'Users'}`}
        </button>
      </div>
    </div>
  );
}
