// Wrapper for the contextual right rail. Sticky, fixed width, scrollable.
// Pass any cards / panels as children.
export default function AppRightRail({ children, width = 300 }) {
  return (
    <aside
      style={{ width: `${width}px` }}
      className="hidden lg:flex shrink-0 flex-col gap-4 p-5 border-l border-white/[0.04] sticky top-0 h-screen overflow-y-auto no-scrollbar"
    >
      {children}
    </aside>
  );
}
