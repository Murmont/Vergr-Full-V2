import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function ProfileSetupStep2Screen() {
  const [banner, setBanner] = useState(null);
  const [links, setLinks] = useState({ twitter: '', instagram: '', youtube: '', website: '' });
  const navigate = useNavigate();
  const { showToast } = useUI();

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
        <div className="flex items-center gap-2"><div className="w-8 h-1 rounded-full bg-primary" /><div className="w-8 h-1 rounded-full bg-primary" /></div>
        <button onClick={() => navigate('/setup/follow-suggestions')} className="text-text-secondary text-sm font-semibold">Skip</button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8 overflow-y-auto">
        <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Customize<br/>Your Profile</h1>
        <p className="text-text-secondary text-base mb-8">Add a banner and social links to make your profile stand out.</p>
        <div className="mb-6">
          <p className="text-text-secondary text-sm font-semibold mb-3">Profile Banner</p>
          <button onClick={() => showToast('Banner upload coming soon', 'info')}
            className="w-full h-32 rounded-2xl bg-surface border-2 border-dashed border-surface-border flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors">
            <Icon name="image" size={28} className="text-text-secondary" />
            <span className="text-text-secondary text-sm">Tap to upload banner</span>
          </button>
        </div>
        <div className="flex flex-col gap-4 mb-8">
          <p className="text-text-secondary text-sm font-semibold">Social Links</p>
          {Object.entries(links).map(([key, val]) => (
            <div key={key} className="flex items-center gap-3 bg-surface rounded-xl px-4 py-3 border border-surface-border focus-within:border-primary">
              <Icon name={key === 'website' ? 'globe' : key === 'twitter' ? 'at-sign' : key} size={18} className="text-text-secondary shrink-0" />
              <input type="text" value={val} onChange={e => setLinks(p => ({ ...p, [key]: e.target.value }))}
                placeholder={key.charAt(0).toUpperCase() + key.slice(1) + ' URL'} className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-text-secondary/50" />
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/setup/follow-suggestions')} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Continue</button>
      </main>
    </div>
  );
}
