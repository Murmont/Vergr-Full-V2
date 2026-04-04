import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, googleProvider, db, rtdb } from '../firebase/config';
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, signOut, sendPasswordResetEmail, updateProfile,
} from 'firebase/auth';
import { doc, updateDoc, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { isTauri } from '../utils/platform';
import { desktopGoogleAuth } from '../utils/desktopAuth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
        const userFirestoreRef = doc(db, 'users', user.uid);
        const connectedRef = ref(rtdb, '.info/connected');

        onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === false) {
            updateDoc(userFirestoreRef, { status: 'offline' });
            return;
          }

          onDisconnect(userStatusDatabaseRef).set({
            state: 'offline',
            last_changed: rtdbTimestamp(),
          }).then(() => {
            set(userStatusDatabaseRef, {
              state: 'online',
              last_changed: rtdbTimestamp(),
            });
            
            updateDoc(userFirestoreRef, { 
              status: 'online', 
              lastSeen: firestoreTimestamp() 
            });
          });
        });
      }
    });

    return () => unsub();
  }, []);

  const login = useCallback(async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUp = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    // In Tauri desktop, signInWithPopup doesn't work — use localhost OAuth bridge
    if (isTauri()) {
      return desktopGoogleAuth();
    }
    return signInWithPopup(auth, googleProvider);
  }, []);

  const logout = useCallback(async () => {
    return signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email) => {
    return sendPasswordResetEmail(auth, email);
  }, []);

  const value = {
    currentUser, loading,
    login, signUp, loginWithGoogle, logout, resetPassword,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
