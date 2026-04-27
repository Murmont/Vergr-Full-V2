import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function TwoFALoginScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [method, setMethod] = useState('authenticator');
  const navigate = useNavigate();
  const { showToast } = useUI();

  const handleCodeChange = (i, val) => {
    if (val.length > 1) return;
    const n = [...code]; n[i] = val; setCode(n);
    if (val && i < 5) document.getElementById(`2fa-${i+1}`)?.focus();
  };

  const handleVerify = () => {
    if (code.join('').length < 6) { showToast('Enter the full code', 'error'); return; }
    navigate('/', { replace: true });
  };

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow_back" size={24} /></button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon name="shield" size={36} className="text-primary" />
          </div>
        </div>
        <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">Two-Factor<br/>Authentication</h1>
        <p className="text-text-secondary text-base text-center mb-8">Enter the 6-digit code from your authenticator app to continue.</p>
        <div className="flex gap-3 justify-center mb-6">
          {code.map((c, i) => (
            <input key={i} id={`2fa-${i}`} type="text" inputMode="numeric" maxLength={1} value={c}
              onChange={e => handleCodeChange(i, e.target.value)}
              className="w-12 h-14 bg-surface border border-surface-border rounded-xl text-center text-white text-xl font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          ))}
        </div>
        <div className="flex justify-center gap-4 mb-8">
          {['authenticator', 'sms', 'email'].map(m => (
            <button key={m} onClick={() => setMethod(m)}
              className={`px-4 py-2 rounded-full text-xs font-bold ${method === m ? 'bg-primary/20 text-primary' : 'bg-surface text-text-secondary'}`}>
              {m === 'authenticator' ? 'App' : m === 'sms' ? 'SMS' : 'Email'}
            </button>
          ))}
        </div>
        <button className="text-primary text-sm font-semibold text-center mb-6">Resend Code</button>
        <button onClick={handleVerify} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Verify</button>
        <button onClick={() => navigate('/login')} className="text-text-secondary text-sm text-center mt-4">Back to Login</button>
      </main>
    </div>
  );
}
