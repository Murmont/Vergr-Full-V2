import { Outlet, useMatch } from 'react-router-dom';
import { useEffect } from 'react';
import useResponsive from '../hooks/useResponsive';
import DesktopSidebar from '../components/DesktopSidebar';
import BottomNav from '../components/BottomNav';
import SquadsListPanel from '../components/SquadsListPanel';
import SquadInfoRail from '../components/brand/SquadInfoRail';
import { useLayout } from '../context/LayoutContext';

// On /squads (index) we render the redesigned full-width Find Squad screen
// without the legacy 360px squad list panel (the new design owns its own
// list + right rail).
// On /squads/:squadId/* we keep the old master/detail layout: left list +
// main content. The new SquadChat redesign owns its own right rail.
export default function SquadsMasterDetail() {
  const { isDesktop } = useResponsive();
  const matchSquad = useMatch('/squads/:squadId/*');
  const { setRightPanel } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <div className="max-w-[480px] mx-auto min-h-screen relative">
          <Outlet />
          {!matchSquad && <BottomNav />}
        </div>
      </div>
    );
  }

  // Full-width Find Squad index (new design owns its own right rail)
  if (!matchSquad) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <DesktopSidebar />
        <div className="ml-[240px]">
          <Outlet />
        </div>
      </div>
    );
  }

  // Squad detail / chat / settings — keep master/detail
  return (
    <div className="h-screen bg-bg-dark overflow-hidden">
      <DesktopSidebar />
      <div className="h-full ml-[240px] flex">
        <div className="w-[300px] h-full border-r border-white/[0.06] flex flex-col">
          <SquadsListPanel />
        </div>
        <div className="flex-1 h-full flex flex-col overflow-y-auto min-w-0">
          <Outlet />
        </div>
        <SquadInfoRail />
      </div>
    </div>
  );
}
