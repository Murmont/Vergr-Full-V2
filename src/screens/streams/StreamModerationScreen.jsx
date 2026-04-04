import { useEffect } from 'react';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function StreamModerationScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Stream Moderation" showBack />
      <div className="px-4 py-4 text-center py-16">
        <Icon name="shield" size={48} className="text-text-muted/30 mx-auto mb-3" />
        <p className="text-text-muted text-sm">Moderation tools available during live streams</p>
        <p className="text-text-muted/60 text-xs mt-1">Timeout, ban, and manage chat from here when streaming</p>
      </div>
    </div>
  );
}
