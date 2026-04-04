import { Outlet, useMatch } from 'react-router-dom';
import { useEffect } from 'react';
import useResponsive from '../hooks/useResponsive';
import DesktopSidebar from '../components/DesktopSidebar';
import BottomNav from '../components/BottomNav';
import SquadsListPanel from '../components/SquadsListPanel';
import RightSidebarPanel from '../components/RightSidebarPanel';
import { useLayout } from '../context/LayoutContext';

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

  return (
    <div className="h-screen bg-bg-dark overflow-hidden">
      <DesktopSidebar />
      <div className="h-full ml-[260px] flex">
        {/* Left panel – fixed width, scrollable list of squads */}
        <div className="w-[360px] h-full border-r border-white/[0.06] flex flex-col">
          <SquadsListPanel />
        </div>

        {/* Main content – fills remaining space */}
        <div className="flex-1 h-full flex flex-col overflow-y-auto">
          {matchSquad ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
                  <span className="text-4xl">🎮</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Select a squad</h3>
                <p className="text-sm">Choose a squad from the left panel to view details</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar – only if no squad selected */}
        {!matchSquad && (
          <div className="hidden xl:block w-[340px] h-full border-l border-white/[0.06] overflow-y-auto no-scrollbar">
            <RightSidebarPanel />
          </div>
        )}
      </div>
    </div>
  );
}