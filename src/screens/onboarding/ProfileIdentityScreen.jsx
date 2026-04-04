import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function ProfileIdentityScreen() {
  const [displayName, setDisplayName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [country, setCountry] = useState('');
  const navigate = useNavigate();

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
        <button onClick={() => navigate('/setup/interests')} className="text-text-secondary text-sm font-semibold">Skip</button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Tell Us About<br/>Yourself</h1>
        <p className="text-text-secondary text-base mb-8">This helps us personalize your experience.</p>
        <div className="flex flex-col gap-5 mb-8">
          <label className="block"><span className="text-text-secondary text-sm font-semibold mb-2 block">Display Name</span>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How should we call you?"
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white outline-none focus:border-primary placeholder:text-text-secondary/50" /></label>
          <label className="block"><span className="text-text-secondary text-sm font-semibold mb-2 block">Pronouns (optional)</span>
            <select value={pronouns} onChange={e => setPronouns(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white outline-none focus:border-primary">
              <option value="">Select</option><option>He/Him</option><option>She/Her</option><option>They/Them</option><option>Other</option>
            </select></label>
          <label className="block"><span className="text-text-secondary text-sm font-semibold mb-2 block">Country / Region</span>
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white outline-none focus:border-primary">
              <option value="">Select your country</option><option>South Africa</option><option>United States</option><option>United Kingdom</option><option>Germany</option><option>Japan</option><option>Brazil</option><option>Australia</option><option>Other</option>
            </select></label>
        </div>
        <button onClick={() => navigate('/setup/interests')} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Continue</button>
      </main>
    </div>
  );
}
