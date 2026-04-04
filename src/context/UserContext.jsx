import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUser, subscribeToWallet, updateUser as updateUserDoc } from '../firebase/firestore';

const UserContext = createContext(null);
const DEFAULT_WALLET = { balance: 0, gems: 0, vp: 0, totalEarned: 0, totalSpent: 0, totalGemsEarned: 0, totalReceived: 0, totalTipped: 0, tier: 'free', dailyStreak: 0 };

export function UserProvider({ children }) {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(DEFAULT_WALLET);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setProfile(null);
      setWallet(DEFAULT_WALLET);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubUser = subscribeToUser(currentUser.uid, (userData) => {
      setProfile(userData);
      setLoading(false);
    });

    // Wallet is created by onUserCreated Cloud Function on signup.
    // subscribeToWallet returns defaults (balance: 0) if doc doesn't exist yet.
    const unsubWallet = subscribeToWallet(currentUser.uid, (walletData) => {
      setWallet(walletData);
    });

    return () => { unsubUser(); unsubWallet(); };
  }, [currentUser]);

  const updateProfile = async (data) => {
    if (!currentUser) return;
    await updateUserDoc(currentUser.uid, data);
  };

  const value = { profile, wallet, loading, updateProfile };
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};
