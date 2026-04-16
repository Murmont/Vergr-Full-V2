import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import VergrLogo from '../../components/VergrLogo';
import Icon from '../../components/Icon';

// Read a pending referrer id from (in order): the current URL's ?ref= param,
// localStorage (set when the user first landed on any page via an invite),
// or null. The invite link is `https://vergr-44494.web.app/?ref=<uid>` — the
// AppRouter root handler stashes the value into localStorage on mount so it
// survives the multi-step signup flow.
function getPendingReferrerId() {
  try {
    const urlRef = new URLSearchParams(window.location.search).get('ref')
      || new URLSearchParams(window.location.hash.split('?')[1] || '').get('ref');
    if (urlRef) return urlRef;
    return localStorage.getItem('vergr_ref') || null;
  } catch { return null; }
}

export default function SignUpStep2() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const location = useLocation();
  const { email, password } = location.state || {};

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const handleCreate = async () => {
    if (!usernameValid || !displayName) return;
    setLoading(true);
    try {
      if (!email) { navigate('/login'); return; }
      else { await signUp(email, password, displayName); }

      // Persist referral attribution if one is pending. We write it after
      // `signUp()` so we know the auth user + their Firestore user doc both
      // exist. `referredBy` is later read by `claimQuestReward('refer_friend')`
      // to validate the invitee genuinely came from the referrer's link.
      try {
        const referrerId = getPendingReferrerId();
        if (referrerId && auth.currentUser && referrerId !== auth.currentUser.uid) {
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            referredBy: referrerId,
            referredAt: new Date(),
            username: username,
          });
        } else if (auth.currentUser) {
          // Username is collected here but the cloud function's user-doc
          // creation leaves it null — patch it in either way.
          await updateDoc(doc(db, 'users', auth.currentUser.uid), { username });
        }
        localStorage.removeItem('vergr_ref');
      } catch (e) {
        console.warn('Post-signup user-doc patch failed:', e);
      }

      navigate('/onboarding/welcome', { replace: true });
    } catch (err) {
      showToast(err.message || 'Sign up failed', 'error');
    }
    setLoading(false);
  };

  return (
    <div className="screen-container items-center p-6 min-h-screen">
      <div className="w-full max-w-[400px]">
        <div className="flex justify-center mb-8 mt-6"><VergrLogo size={44} /></div>
        <h1 className="font-syne text-2xl font-bold text-center mb-1">Choose Your Identity</h1>
        <p className="text-text-secondary text-center mb-8">This is how gamers will find you</p>

        <div className="flex flex-col gap-5">
          <label className="block relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-cyan transition-colors">
              <Icon name="alternate_email" size={22} />
            </div>
            <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="input-with-icon pr-12" maxLength={20} />
            {username.length >= 3 && (
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                <Icon name={usernameValid ? 'check_circle' : 'cancel'} size={20}
                  className={usernameValid ? 'text-brand-cyan' : 'text-brand-ember'} />
              </div>
            )}
          </label>
          {username && !usernameValid && (
            <p className="text-brand-ember text-xs px-1 -mt-3">3-20 characters, letters, numbers, underscores only</p>
          )}

          <label className="block relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-text-muted group-focus-within:text-brand-cyan transition-colors">
              <Icon name="person" size={22} />
            </div>
            <input type="text" placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="input-with-icon" maxLength={30} />
          </label>

          <button onClick={handleCreate} disabled={!usernameValid || !displayName || loading}
            className={`btn-primary mt-4 ${(!usernameValid || !displayName) ? 'opacity-40 cursor-not-allowed' : ''}`}>
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}
