import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function TwoFASetupScreen() {
  const [method, setMethod] = useState('authenticator');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const navigate = useNavigate();
  const { showToast } = useUI();

  const methods = [
    { id: 'authenticator', icon: 'shield', label: 'Authenticator App', desc: 'Use Google Authenticator, Authy, or similar to generate codes.', badge: 'Recommended' },
    { id: 'sms', icon: 'smartphone', label: 'SMS Verification', desc: 'Receive a code via text message to your phone number.', badge: null },
    { id: 'email', icon: 'mail', label: 'Email Verification', desc: 'Receive a code via email each time you sign in.', badge: null },
  ];

  const handleCodeChange = (i, val) => {
    if (val.length > 1) return;
    const n = [...code];
    n[i] = val;
    setCode(n);
    if (val && i < 5) document.getElementById(`code-${i + 1}`)?.focus();
  };

  const handleVerify = () => {
    if (code.join('').length < 6) { showToast('Please enter the full code', 'error'); return; }
    showToast('2FA enabled successfully!', 'success');
    navigate('/settings', { replace: true });
  };

  return (
    <div className="screen-container min-h-screen">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <button onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
        <button onClick={() => navigate(-1)} className="text-text-secondary text-sm font-semibold">Skip</button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        {step === 1 && (
          <>
            <div className="mb-8">
              <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Secure Your<br/>Account</h1>
              <p className="text-text-secondary text-base leading-relaxed">Add an extra layer of protection to your Vergr inventory and profile.</p>
            </div>
            <div className="flex flex-col gap-4 mb-8">
              {methods.map(m => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`relative rounded-2xl p-5 flex items-start gap-4 text-left transition-all ${method === m.id ? 'bg-surface ring-2 ring-primary/60' : 'bg-surface/60 ring-1 ring-surface-border'}`}>
                  <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${method === m.id ? 'bg-primary/10 text-primary' : 'bg-white/5 text-text-secondary'}`}>
                    <Icon name={m.icon} size={22} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white text-lg font-bold">{m.label}</h3>
                      {m.badge && <span className="bg-primary/20 text-primary text-[10px] uppercase font-bold px-2 py-1 rounded-full">{m.badge}</span>}
                    </div>
                    <p className="text-text-secondary text-sm leading-relaxed">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Continue</button>
          </>
        )}
        {step === 2 && (
          <>
            <div className="mb-8">
              <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Enter Code</h1>
              <p className="text-text-secondary text-base leading-relaxed">
                {method === 'authenticator' ? 'Open your authenticator app and enter the 6-digit code.' :
                 method === 'sms' ? 'We sent a code to your phone number.' : 'We sent a code to your email address.'}
              </p>
            </div>
            {method === 'authenticator' && (
              <div className="bg-surface rounded-2xl p-6 mb-8 flex flex-col items-center">
                <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center mb-4">
                  <div className="w-32 h-32 bg-[url('data:image/svg+xml,...')] grid grid-cols-5 grid-rows-5 gap-1 p-2">
                    {Array.from({length: 25}).map((_, i) => <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-black' : 'bg-white'}`} />)}
                  </div>
                </div>
                <p className="text-text-secondary text-xs text-center">Scan QR code with your authenticator app</p>
                <div className="mt-3 bg-surface-border rounded-lg px-4 py-2">
                  <code className="text-primary text-xs font-mono tracking-wider">VRGR-XXXX-XXXX-XXXX</code>
                </div>
              </div>
            )}
            <div className="flex gap-3 justify-center mb-8">
              {code.map((c, i) => (
                <input key={i} id={`code-${i}`} type="text" inputMode="numeric" maxLength={1} value={c}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  className="w-12 h-14 bg-surface border border-surface-border rounded-xl text-center text-white text-xl font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
              ))}
            </div>
            <button className="text-primary text-sm font-semibold text-center mb-6">Resend Code</button>
            <button onClick={handleVerify} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Verify & Enable</button>
          </>
        )}
      </main>
    </div>
  );
}
