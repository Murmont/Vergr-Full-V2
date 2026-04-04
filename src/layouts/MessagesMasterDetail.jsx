import { Outlet, useMatch } from 'react-router-dom';
import { useEffect } from 'react';
import useResponsive from '../hooks/useResponsive';
import DesktopSidebar from '../components/DesktopSidebar';
import BottomNav from '../components/BottomNav';
import MessagesListPanel from '../components/MessagesListPanel';
import RightSidebarPanel from '../components/RightSidebarPanel';
import { useLayout } from '../context/LayoutContext'; // <-- import

export default function MessagesMasterDetail() {
  const { isDesktop } = useResponsive();
  const matchChat = useMatch('/messages/:chatId');
  const { setRightPanel } = useLayout(); // <-- use context

  // Clear any global right panel when entering messages section
  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  if (!isDesktop) {
    return (
      <div className="min-h-screen bg-bg-dark">
        <div className="max-w-[480px] mx-auto min-h-screen relative">
          <Outlet />
          {!matchChat && <BottomNav />}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-dark overflow-hidden">
      <DesktopSidebar />
      <div className="h-full ml-[260px] flex">
        {/* Left panel – fixed width, scrollable list */}
        <div className="w-[360px] h-full border-r border-white/[0.06] flex flex-col">
          <MessagesListPanel />
        </div>

        {/* Main content – fills remaining space */}
        <div className="flex-1 h-full flex flex-col">
          {matchChat ? (
            <Outlet />
          ) : (
            <div className="flex items-center justify-center h-full text-text-muted">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-surface-2 flex items-center justify-center">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">Select a chat</h3>
                <p className="text-sm">Choose a conversation from the left panel</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar – only if no chat open */}
        {!matchChat && (
          <div className="hidden xl:block w-[340px] h-full border-l border-white/[0.06] overflow-y-auto no-scrollbar">
            <RightSidebarPanel />
          </div>
        )}
      </div>
    </div>
  );
}