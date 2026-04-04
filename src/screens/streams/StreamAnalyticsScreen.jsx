import { useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function StreamAnalyticsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const { profile } = useUser();
  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Stream Analytics" showBack />
      <div className="px-4 py-4">
        <div className="text-center py-16">
          <Icon name="analytics" size={48} className="text-text-muted/30 mx-auto mb-3" />
          <p className="text-text-muted text-sm">No stream data yet</p>
          <p className="text-text-muted/60 text-xs mt-1">Go live to start tracking your stream performance</p>
        </div>
      </div>
    </div>
  );
}
