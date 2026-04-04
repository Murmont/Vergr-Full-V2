import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
export default function usePresence() {
  const { currentUser } = useAuth();
  useEffect(() => {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
    updateDoc(ref, { isOnline: true, lastSeen: serverTimestamp() }).catch(() => {});
    const off = () => updateDoc(ref, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
    window.addEventListener('beforeunload', off);
    return () => { off(); window.removeEventListener('beforeunload', off); };
  }, [currentUser]);
}
