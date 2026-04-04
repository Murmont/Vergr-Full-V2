import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [activeTab, setActiveTab] = useState('home');
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [notificationsDrawerOpen, setNotificationsDrawerOpen] = useState(false);

  // Theme: 'dark' | 'light' | 'system'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('vergr_theme') || 'dark'; } catch { return 'dark'; }
  });

  useEffect(() => {
    const root = document.documentElement;
    let resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    root.setAttribute('data-theme', resolved);
    // Tailwind darkMode: 'class'
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try { localStorage.setItem('vergr_theme', theme); } catch {}
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = () => setTheme('system'); // re-trigger effect
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark');
  }, []);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), duration);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return (
    <UIContext.Provider value={{
      activeTab, setActiveTab,
      modal, setModal, closeModal,
      toast, showToast,
      notificationsDrawerOpen, setNotificationsDrawerOpen,
      theme, setTheme, toggleTheme
    }}>
      {children}
    </UIContext.Provider>
  );
}

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within UIProvider');
  return ctx;
};