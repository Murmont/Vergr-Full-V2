import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { updateUserSettings } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'af', label: 'Afrikaans', flag: '🇿🇦' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

export default function LanguageSettingsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const { showToast } = useUI();
  const [lang, setLang] = useState('en');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.settings?.language) {
      setLang(profile.settings.language);
    }
  }, [profile]);

  const handleSelect = async (code) => {
    setLang(code);
    setSaving(true);
    try {
      await updateUserSettings(currentUser.uid, {
        ...profile?.settings,
        language: code,
      });
      const selected = LANGUAGES.find(l => l.code === code);
      showToast(`Language set to ${selected?.label}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save language', 'error');
    }
    setSaving(false);
  };

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Language" showBack />
      <div className="px-4 py-2">
        <p className="text-text-muted text-xs mb-4">Choose your preferred language for the VERGR interface.</p>
        <div className="space-y-1">
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => handleSelect(l.code)}
              className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
                lang === l.code ? 'bg-brand-cyan/5 border border-brand-cyan/30' : 'bg-surface-1 border border-transparent hover:bg-surface-2'
              }`}
            >
              <span className="text-xl">{l.flag}</span>
              <span className="flex-1 text-sm font-semibold text-left">{l.label}</span>
              {lang === l.code && <Icon name="check_circle" filled size={20} className="text-brand-cyan" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
