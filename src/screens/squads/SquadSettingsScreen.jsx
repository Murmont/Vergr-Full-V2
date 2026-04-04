import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getSquadMember } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadSettingsScreen() {
  const { squadId } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [squad, setSquad] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!squadId || !currentUser) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'squads', squadId));
      if (snap.exists()) setSquad({ id: snap.id, ...snap.data() });
      const mem = await getSquadMember(squadId, currentUser.uid);
      setMyRole(mem?.role);
    };
    load();
  }, [squadId, currentUser]);

  const handleSave = async () => {
    if (!squad) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'squads', squadId), {
        name: squad.name, description: squad.description, isPublic: squad.isPublic,
        updatedAt: serverTimestamp(),
      });
      showToast('Settings saved', 'success');
    } catch (err) { showToast('Failed to save', 'error'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this squad? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'squads', squadId));
      showToast('Squad deleted', 'info');
      navigate('/squads');
    } catch (err) { showToast('Failed to delete', 'error'); }
  };

  const isPresident = myRole === 'president';
  if (!squad) return <div className="flex justify-center py-20"><div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" /></div>;

  const quickActions = [
    { icon: 'group', label: 'Members', path: `/squads/${squadId}/members` },
    { icon: 'how_to_vote', label: 'Roles & Voting', path: `/squads/${squadId}/roles` },
    { icon: 'campaign', label: 'Announcements', path: `/squads/${squadId}/announcements` },
    { icon: 'leaderboard', label: 'Leaderboard', path: `/squads/${squadId}/leaderboard` },
    { icon: 'photo_library', label: 'Media', path: `/squads/${squadId}/media` },
    { icon: 'push_pin', label: 'Pinned', path: `/squads/${squadId}/pinned` },
  ];

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Squad Settings</h1>
          {isPresident && (
            <button onClick={handleSave} disabled={saving} className="ml-auto text-brand-cyan font-semibold text-sm">
              {saving ? '...' : 'Save'}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Squad Settings</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {isPresident && (
          <>
            <div>
              <label className="text-text-muted text-xs font-bold uppercase mb-2 block">Squad Name</label>
              <input value={squad.name || ''} onChange={e => setSquad(p => ({ ...p, name: e.target.value }))} maxLength={30}
                className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary focus:border-brand-cyan focus:outline-none" />
            </div>
            <div>
              <label className="text-text-muted text-xs font-bold uppercase mb-2 block">Description</label>
              <textarea value={squad.description || ''} onChange={e => setSquad(p => ({ ...p, description: e.target.value }))} rows={3} maxLength={200}
                className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-text-primary focus:border-brand-cyan focus:outline-none resize-none" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <div>
                <p className="text-sm font-semibold">{squad.isPublic ? 'Public Squad' : 'Private Squad'}</p>
                <p className="text-xs text-text-muted">{squad.isPublic ? 'Anyone can join' : 'Requires approval'}</p>
              </div>
              <button onClick={() => setSquad(p => ({ ...p, isPublic: !p.isPublic }))}
                className={`w-12 h-7 rounded-full transition-colors ${squad.isPublic ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${squad.isPublic ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </>
        )}

        <div>
          <p className="text-text-muted text-xs font-bold uppercase mb-3">Quick Actions</p>
          <div className="space-y-1">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.path)} className="flex items-center gap-3 w-full p-4 rounded-2xl bg-surface-1 border border-white/[0.06] text-left hover:border-white/[0.12] transition-colors">
                <Icon name={a.icon} size={20} className="text-text-secondary" />
                <span className="flex-1 text-sm font-semibold">{a.label}</span>
                <Icon name="chevron_right" size={18} className="text-text-muted" />
              </button>
            ))}
          </div>
        </div>

        {isPresident && (
          <button onClick={handleDelete} className="w-full py-3 rounded-xl border border-brand-ember/30 text-brand-ember text-sm font-semibold hover:bg-brand-ember/5 transition-colors">
            Delete Squad
          </button>
        )}
      </div>
    </div>
  );
}