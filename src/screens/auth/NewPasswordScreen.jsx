import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import Icon from '../../components/Icon';

export default function NewPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useUI();

  const strength = password.length >= 12 ? 3 : password.length >= 8 ? 2 : password.length >= 4 ? 1 : 0;
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-primary'];

  const handleSubmit = () => {
    if (password.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
    navigate('/reset-success', { replace: true });
  };

  return (
    <div className="screen-container min-h-screen flex flex-col">
      <header className="flex items-center px-5 pt-12 pb-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-white/80"><Icon name="arrow_back" size={24} /></button>
      </header>
      <main className="flex-1 flex flex-col px-6 pt-4 pb-8">
        <h1 className="font-syne text-text-primary text-2xl font-bold leading-tight mb-3">Create New<br/>Password</h1>
        <p className="text-text-secondary text-base mb-8">Your new password must be different from your previous password.</p>
        <label className="block mb-4">
          <span className="text-text-secondary text-sm font-semibold mb-2 block">New Password</span>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white pr-12 outline-none focus:border-primary" placeholder="Enter new password" />
            <button onClick={() => setShow(!show)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary"><Icon name={show ? 'eye-off' : 'eye'} size={20} /></button>
          </div>
        </label>
        <div className="flex gap-1.5 mb-1">
          {[0,1,2,3].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= strength ? colors[strength] : 'bg-surface-border'}`} />)}
        </div>
        <p className={`text-xs mb-6 ${colors[strength]?.replace('bg-','text-')}`}>{labels[strength]}</p>
        <label className="block mb-8">
          <span className="text-text-secondary text-sm font-semibold mb-2 block">Confirm Password</span>
          <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
            className="w-full bg-surface border border-surface-border rounded-xl px-4 py-4 text-white outline-none focus:border-primary" placeholder="Confirm new password" />
        </label>
        <button onClick={handleSubmit} className="btn-primary w-full py-4 rounded-2xl text-lg font-bold mt-auto">Reset Password</button>
      </main>
    </div>
  );
}
