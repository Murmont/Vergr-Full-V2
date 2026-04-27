import { Outlet, useMatch } from 'react-router-dom';
import { useEffect } from 'react';
import useResponsive from '../hooks/useResponsive';
import DesktopSidebar from '../components/DesktopSidebar';
import BottomNav from '../components/BottomNav';
import MessagesListPanel from '../components/MessagesListPanel';
import ChatMembersRail from '../components/brand/ChatMembersRail';
import { useLayout } from '../context/LayoutContext';

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
      <div className="h-full ml-[240px] flex">
        {/* Channel / DM list */}
        <div className="w-[280px] h-full border-r border-white/[0.06] flex flex-col bg-[#0B0E1A]">
          <MessagesListPanel />
        </div>

        {/* Main content */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          {matchChat ? (
            <Outlet />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <img src="/brand/logo.png" alt="VERGR" className="w-20 h-20 mb-6 rounded-2xl opacity-80" />
              <h1 className="font-syne text-4xl font-extrabold tracking-tight text-text-primary mb-2">CONNECT</h1>
              <p className="text-text-muted text-sm max-w-xs">Talk. Team up. Belong. Choose a conversation from the left panel to start chatting.</p>
            </div>
          )}
        </div>

        {/* Members rail (only when a chat is open) */}
        {matchChat && <ChatMembersRail />}
      </div>
    </div>
  );
}