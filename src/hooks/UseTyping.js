import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
export default function useTyping(chatId) {
  const [typingUsers, setTypingUsers] = useState([]);
  const timeoutRef = useRef(null);
  useEffect(() => {
    if (!chatId || !auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'conversations', chatId), (snap) => {
      const data = snap.data();
      if (!data) { setTypingUsers([]); return; }
      let list = data.typingUsers || [];
      if (list.length === 0 && data.typing && data.typing !== auth.currentUser.uid) list = [{ uid: data.typing, name: 'User' }];
      setTypingUsers(list.filter(u => u?.uid !== auth.currentUser.uid));
    }, () => {});
    return () => unsub();
  }, [chatId]);
  const setTyping = useCallback(() => {
    if (!chatId || !auth.currentUser) return;
    clearTimeout(timeoutRef.current);
    updateDoc(doc(db, 'conversations', chatId), { typingUsers: [{ uid: auth.currentUser.uid, name: auth.currentUser.displayName || 'User' }] }).catch(() => updateDoc(doc(db, 'conversations', chatId), { typing: auth.currentUser.uid }).catch(() => {}));
    timeoutRef.current = setTimeout(() => { updateDoc(doc(db, 'conversations', chatId), { typingUsers: [] }).catch(() => updateDoc(doc(db, 'conversations', chatId), { typing: null }).catch(() => {})); }, 3000);
  }, [chatId]);
  const clearTyping = useCallback(() => {
    if (!chatId) return;
    clearTimeout(timeoutRef.current);
    updateDoc(doc(db, 'conversations', chatId), { typingUsers: [] }).catch(() => updateDoc(doc(db, 'conversations', chatId), { typing: null }).catch(() => {}));
  }, [chatId]);
  return { typingUsers, setTyping, clearTyping };
}
