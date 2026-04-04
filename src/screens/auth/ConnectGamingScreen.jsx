import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function ConnectGamingScreen() {
  const [connected, setConnected] = useState({});
  const navigate = useNavigate();
  const platforms = [
    { id: 'steam', label: 'Steam', color: '#1B2838' },
    { id: 'playstation', label: 'PlayStation', color: '#003791' },
    { id: 'xbox', label: 'Xbox', color: '#107C10' },
    { id: 'nintendo', label: 'Nintendo', color: '#E60012' },
    { id: 'epicgames', label: 'Epic Games', color: '#313131' },
    { id: 'battlenet', label: 'Battle.net', color: '#00AEFF' },
    { id: 'riotgames', label: 'Riot Games', color: '#D32936' },
    { id: 'ea', label: 'EA / Origin', color: '#FF4747' },
  ];

  const toggle = (id) => setConnected(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
        <button onClick={() => navigate('/setup/profile')} className="text-text-secondary text-sm font-semibold">Skip</button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Connect Gaming<br/>Accounts</h1>
        <p className="text-text-secondary text-base mb-8">Link your gaming profiles to show off your stats and achievements.</p>
        <div className="flex flex-col gap-3 mb-8">
          {platforms.map(p => (
            <button key={p.id} onClick={() => toggle(p.id)}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${connected[p.id] ? 'bg-primary/5 border-primary/30' : 'bg-surface border-surface-border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                  <Icon name="gamepad-2" size={18} style={{ color: p.color }} />
                </div>
                <span className="text-white font-semibold">{p.label}</span>
              </div>
              {connected[p.id] ? (
                <span className="text-primary text-sm font-bold flex items-center gap-1"><Icon name="check-circle" size={16} /> Connected</span>
              ) : (
                <span className="text-text-secondary text-sm">Connect</span>
              )}
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/setup/profile')} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">
          Continue {Object.values(connected).filter(Boolean).length > 0 && `(${Object.values(connected).filter(Boolean).length} connected)`}
        </button>
      </main>
    </div>
  );
}
