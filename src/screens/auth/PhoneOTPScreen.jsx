import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function PhoneOTPScreen() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useUI();
  const phone = location.state?.phone || '+27•••••1234';

  useEffect(() => { const t = setInterval(() => setTimer(p => p > 0 ? p - 1 : 0), 1000); return () => clearInterval(t); }, []);

  const handleChange = (i, val) => {
    if (val.length > 1) return;
    const n = [...code]; n[i] = val; setCode(n);
    if (val && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleVerify = () => {
    if (code.join('').length < 6) { showToast('Enter the full code', 'error'); return; }
    showToast('Phone verified!', 'success');
    navigate(-1);
  };

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8 items-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Icon name="smartphone" size={32} className="text-primary" />
        </div>
        <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">Enter OTP</h1>
        <p className="text-text-secondary text-base text-center mb-8">Code sent to <span className="text-white font-semibold">{phone}</span></p>
        <div className="flex gap-3 mb-6">
          {code.map((c, i) => (
            <input key={i} id={`otp-${i}`} type="text" inputMode="numeric" maxLength={1} value={c}
              onChange={e => handleChange(i, e.target.value)}
              className="w-12 h-14 bg-surface border border-surface-border rounded-xl text-center text-white text-xl font-bold focus:border-primary focus:ring-1 focus:ring-primary outline-none" />
          ))}
        </div>
        {timer > 0 ? (
          <p className="text-text-secondary text-sm mb-8">Resend in <span className="text-primary font-bold">{timer}s</span></p>
        ) : (
          <button onClick={() => setTimer(60)} className="text-primary text-sm font-semibold mb-8">Resend Code</button>
        )}
        <button onClick={handleVerify} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Verify</button>
      </main>
    </div>
  );
}
