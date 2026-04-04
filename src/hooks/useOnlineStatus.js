// src/hooks/useOnlineStatus.js
import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../firebase/config';

/**
 * useOnlineStatus - Reads a specific user's online/offline status directly from RTDB.
 * No Cloud Functions needed. Works immediately.
 *
 * Returns: { isOnline, lastSeen }
 *   isOnline  — boolean
 *   lastSeen  — Date | null (last time the user was seen online)
 */
export default function useOnlineStatus(userId) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(null);

  useEffect(() => {
    if (!userId || !rtdb) return;

    const statusRef = ref(rtdb, `/status/${userId}`);
    const unsub = onValue(statusRef, (snap) => {
      if (!snap.exists()) {
        setIsOnline(false);
        setLastSeen(null);
        return;
      }
      const data = snap.val();
      setIsOnline(data.state === 'online');
      if (data.lastChanged) {
        // RTDB serverTimestamp() returns a number (ms since epoch)
        setLastSeen(new Date(data.lastChanged));
      }
    }, () => {
      // On error (e.g. rules deny read), default to offline
      setIsOnline(false);
    });

    return () => unsub();
  }, [userId]);

  return { isOnline, lastSeen };
}