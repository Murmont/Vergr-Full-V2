export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-bg-dark flex flex-col items-center justify-center z-[100]">
      <h1 className="font-syne text-2xl font-bold text-text-primary mb-1">VERGR</h1>
      <p className="text-text-muted text-xs font-dmmono tracking-widest uppercase">Where Gamers Converge</p>
      <div className="mt-10 w-28 h-[2px] bg-surface-2 rounded-full overflow-hidden">
        <div className="h-full w-full rounded-full animate-shimmer" style={{ backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(77,255,212,0.5) 50%, transparent 100%)' }} />
      </div>
    </div>
  );
}
