import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { createSquad, getUserSquads } from '../../firebase/firestore';
import { MAX_SQUAD_OWN } from '../../utils/constants';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

const GAME_OPTIONS = ['Valorant', 'Apex Legends', 'Fortnite', 'League of Legends', 'CS2', 'Overwatch 2', 'Call of Duty', 'Rocket League', 'Dota 2', 'FIFA', 'Other'];
const EMOJI_ICONS = ['🎮', '⚔️', '🎯', '🏆', '🔥', '💎', '🐉', '🦅', '🐺', '🦊', '🦁', '⚡', '🌟', '💀', '🤖', '👾'];

export default function CreateSquadScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [game, setGame] = useState('');
  const [isPrivate, setIsPrivate] = useState(false); // privacy toggle
  const [icon, setIcon] = useState('🎮');
  const [creating, setCreating] = useState(false);

  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();

  const handleCreate = async () => {
    if (!name.trim() || !game) { showToast('Name and game are required', 'error'); return; }
    if (name.trim().length < 3) { showToast('Name must be at least 3 characters', 'error'); return; }

    setCreating(true);
    try {
      const userSquads = await getUserSquads(currentUser.uid);
      const ownedSquads = userSquads.filter(s => s.ownerId === currentUser.uid);
      if (ownedSquads.length >= MAX_SQUAD_OWN) {
        showToast(`You can only own ${MAX_SQUAD_OWN} squad`, 'error');
        setCreating(false);
        return;
      }

      const squadId = await createSquad(currentUser.uid, {
        name: name.trim(),
        description: description.trim(),
        game,
        isPublic: !isPrivate,   // true if public, false if private
        avatar: icon,
      });

      showToast('Squad created! You are the President 👑', 'success');
      navigate(`/squads/${squadId}/chat`);
    } catch (err) {
      console.error('Failed to create squad:', err);
      showToast('Failed to create squad', 'error');
    }
    setCreating(false);
  };

  return (
    <div className="pb-8">
      {isMobile && <TopBar title="Create Squad" showBack />}
      <div className="px-4 py-4 space-y-6">
        {/* Squad icon */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-surface-2 border-2 border-white/[0.06] flex items-center justify-center text-4xl mb-3">
            {icon}
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-[280px]">
            {EMOJI_ICONS.map(e => (
              <button key={e} onClick={() => setIcon(e)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                  icon === e ? 'bg-brand-cyan/20 border border-brand-cyan/30' : 'bg-surface-2 hover:bg-surface-3'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">Squad Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Apex Predators"
            maxLength={30}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-2xl p-4 text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none text-sm"
          />
          <p className="text-text-muted text-[10px] mt-1 px-1">{name.length}/30</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is your squad about?"
            maxLength={200}
            className="w-full bg-surface-2 border border-white/[0.06] rounded-2xl p-4 text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none h-24 resize-none text-sm"
          />
          <p className="text-text-muted text-[10px] mt-1 px-1">{description.length}/200</p>
        </div>

        {/* Game */}
        <div>
          <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">Primary Game *</label>
          <div className="flex flex-wrap gap-2">
            {GAME_OPTIONS.map(g => (
              <button key={g} onClick={() => setGame(g)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  game === g ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-secondary border border-white/[0.06]'
                }`}>
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <Icon name={isPrivate ? 'lock' : 'public'} size={22} className={isPrivate ? 'text-brand-gold' : 'text-brand-cyan'} />
            <div>
              <p className="text-sm font-semibold">{isPrivate ? 'Private Squad' : 'Public Squad'}</p>
              <p className="text-xs text-text-muted">{isPrivate ? 'Members must request to join' : 'Anyone can find and join'}</p>
            </div>
          </div>
          <button onClick={() => setIsPrivate(!isPrivate)}
            className={`w-12 h-7 rounded-full transition-colors ${isPrivate ? 'bg-brand-gold' : 'bg-surface-3'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Info */}
        <div className="p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/20">
          <div className="flex items-start gap-2">
            <Icon name="info" size={16} className="text-brand-cyan mt-0.5 shrink-0" />
            <div className="text-text-secondary text-xs leading-relaxed">
              <p>As the creator, you'll be the <strong className="text-brand-gold">President</strong>. You can appoint a Vice President, Treasury Secretary, and Security officer, or let members vote for these positions.</p>
            </div>
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || !game || creating}
          className={`w-full py-4 rounded-2xl text-lg font-bold transition-all ${
            name.trim() && game && !creating ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'
          }`}>
          {creating ? 'Creating...' : 'Create Squad'}
        </button>
      </div>
    </div>
  );
}