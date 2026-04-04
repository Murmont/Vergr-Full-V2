import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function PhoneEntryScreen() {
  const [countryCode, setCountryCode] = useState('+27');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const { showToast } = useUI();
  const countries = ['+1', '+27', '+44', '+61', '+81', '+91', '+234', '+49', '+33', '+55'];

  const handleSend = () => {
    if (phone.length < 7) { showToast('Enter a valid phone number', 'error'); return; }
    navigate('/verify-otp', { state: { phone: `${countryCode}${phone}` } });
  };

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow-left" size={24} /></button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Phone<br/>Verification</h1>
        <p className="text-text-secondary text-base mb-8">We'll send you a one-time code to verify your number.</p>
        <div className="flex gap-3 mb-6">
          <select value={countryCode} onChange={e => setCountryCode(e.target.value)}
            className="bg-surface border border-surface-border rounded-xl px-4 py-4 text-white font-bold outline-none focus:border-primary w-24">
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,''))}
            placeholder="Phone number" className="flex-1 bg-surface border border-surface-border rounded-xl px-4 py-4 text-white placeholder:text-text-secondary/50 outline-none focus:border-primary" />
        </div>
        <div className="bg-surface/50 rounded-xl p-4 flex items-start gap-3 mb-8">
          <Icon name="lock" size={16} className="text-primary mt-0.5 shrink-0" />
          <p className="text-text-secondary text-xs leading-relaxed">Your phone number is encrypted and only used for verification purposes.</p>
        </div>
        <button onClick={handleSend} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Send Code</button>
      </main>
    </div>
  );
}
