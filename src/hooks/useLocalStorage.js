import { useState } from 'react';
export default function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; }
    catch { return initialValue; }
  });
  const setValue = (value) => {
    const val = value instanceof Function ? value(stored) : value;
    setStored(val);
    try { window.localStorage.setItem(key, JSON.stringify(val)); } catch {}
  };
  return [stored, setValue];
}
