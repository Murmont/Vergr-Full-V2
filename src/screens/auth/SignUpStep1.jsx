import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import VergrLogo from '../../components/VergrLogo';
import Icon from '../../components/Icon';

export default function SignUpStep1() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const navigate = useNavigate();

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
    const colors = ['', 'bg-brand-ember', 'bg-orange-500', 'bg-brand-gold', 'bg-brand-cyan', 'bg-green-500'];
    return { score, label: labels[score] || '', color: colors[score] || '' };
  }, [password]);

  const canContinue = email && password.length >= 8 && password === confirmPassword && agreed;

  const handleContinue = () => {
    if (!canContinue) return;
    navigate('/signup/step2', { state: { email, password } });
  };

  return (
    <div className="screen-container items-center p-6 min-h-screen">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8 mt-6">
          <VergrLogo size={44} />
        </div>
        <h1 className="font-syne text-2xl font-extrabold text-center mb-1">Create Account</h1>
        <p className="text-text-muted text-sm text-center mb-8">Set up your VERGR account</p>

        <div className="flex flex-col gap-4">
          {/* Email */}
          <label className="block relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-cyan transition-colors">
              <Icon name="mail" size={22} />
            </div>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="input-with-icon" />
          </label>

          {/* Password */}
          <label className="block relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-cyan transition-colors">
              <Icon name="lock" size={22} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'} placeholder="Password (min 8 chars)"
              value={password} onChange={e => setPassword(e.target.value)} className="input-with-icon pr-12"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-text-muted hover:text-text-primary transition-colors">
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={20} />
            </button>
          </label>

          {/* Password strength meter */}
          {password && (
            <div className="px-1">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`flex-1 h-1 rounded-full ${i <= passwordStrength.score ? passwordStrength.color : 'bg-surface-3'} transition-colors`} />
                ))}
              </div>
              <p className="text-xs text-text-secondary">{passwordStrength.label}</p>
            </div>
          )}

          {/* Confirm Password */}
          <label className="block relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-cyan transition-colors">
              <Icon name="lock" size={22} />
            </div>
            <input
              type="password" placeholder="Confirm Password"
              value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-with-icon"
            />
            {confirmPassword && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <Icon name={password === confirmPassword ? 'check_circle' : 'cancel'} size={20}
                  className={password === confirmPassword ? 'text-brand-cyan' : 'text-brand-ember'} />
              </div>
            )}
          </label>

          {/* Terms */}
          <label className="flex items-start gap-3 px-1 cursor-pointer">
            <button type="button" onClick={() => setAgreed(!agreed)}
              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                agreed ? 'bg-brand-cyan border-brand-cyan' : 'border-white/[0.06] bg-surface-2'
              }`}>
              {agreed && <Icon name="check" size={14} className="text-bg-dark" />}
            </button>
            <span className="text-text-secondary text-sm">
              I agree to the <span className="text-brand-cyan">Terms of Service</span> and <span className="text-brand-cyan">Privacy Policy</span>
            </span>
          </label>

          <button onClick={handleContinue} disabled={!canContinue}
            className={`btn-primary mt-2 ${!canContinue ? 'opacity-40 cursor-not-allowed' : ''}`}>
            Continue
          </button>
        </div>

        <div className="text-center mt-6">
          <p className="text-text-secondary text-sm">
            Already have an account? <Link to="/login" className="text-brand-cyan font-semibold">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
