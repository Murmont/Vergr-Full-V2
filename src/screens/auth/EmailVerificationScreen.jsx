import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function EmailVerificationScreen() {
  const [resent, setResent] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="screen-container min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8">
        <Icon name="mail" size={40} className="text-primary" />
      </div>
      <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">Check Your Email</h1>
      <p className="text-text-secondary text-base text-center mb-2 max-w-[300px]">We've sent a verification link to your email address.</p>
      <p className="text-primary font-semibold text-center mb-8">gamer@vergr.gg</p>
      <div className="bg-surface rounded-2xl p-5 w-full max-w-[360px] mb-6">
        <div className="flex items-start gap-3">
          <Icon name="info" size={18} className="text-primary mt-0.5 shrink-0" />
          <p className="text-text-secondary text-sm leading-relaxed">Didn't receive the email? Check your spam folder or request a new link below.</p>
        </div>
      </div>
      <button onClick={() => { setResent(true); }} className="btn-primary w-full max-w-[360px] py-4 rounded-2xl text-lg font-bold mb-4">
        {resent ? 'Email Resent ✓' : 'Resend Verification Email'}
      </button>
      <button onClick={() => navigate('/login')} className="text-text-secondary text-sm font-semibold">Back to Login</button>
    </div>
  );
}
