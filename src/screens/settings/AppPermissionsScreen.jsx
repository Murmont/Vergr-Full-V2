import { useState, useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function AppPermissionsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const [perms, setPerms] = useState({
    camera: true, microphone: true, notifications: true, location: false, storage: true,
  });

  const toggle = (k) => setPerms(p => ({ ...p, [k]: !p[k] }));

  const items = [
    { key: 'camera', label: 'Camera', desc: 'For profile photos, posts, and streaming', icon: 'photo_camera' },
    { key: 'microphone', label: 'Microphone', desc: 'For voice notes and streaming', icon: 'mic' },
    { key: 'notifications', label: 'Notifications', desc: 'Push notifications for activity', icon: 'notifications' },
    { key: 'location', label: 'Location', desc: 'For finding nearby gamers and events', icon: 'location_on' },
    { key: 'storage', label: 'Photo Library', desc: 'For uploading media to posts and chat', icon: 'photo_library' },
  ];

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="App Permissions" showBack />
      <div className="px-4 py-4 space-y-2">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Icon name={item.icon} size={20} className="text-text-secondary shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-text-muted truncate">{item.desc}</p>
              </div>
            </div>
            <button onClick={() => toggle(item.key)}
              className={`w-12 h-7 rounded-full transition-colors shrink-0 ml-3 ${perms[item.key] ? 'bg-brand-cyan' : 'bg-surface-3'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${perms[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
        <p className="text-text-muted text-xs px-1 pt-2">Permissions are managed by your device. Changes here reflect your preferences within the app. To change system-level permissions, go to your device settings.</p>
      </div>
    </div>
  );
}
