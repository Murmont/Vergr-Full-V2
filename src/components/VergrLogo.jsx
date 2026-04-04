export default function VergrLogo({ size = 48, showText = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="rounded-xl bg-brand-cyan flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="font-syne font-black text-bg-dark tracking-tighter" style={{ fontSize: size * 0.38 }}>
          V
        </span>
      </div>
      {showText && (
        <h1 className="font-syne text-2xl font-extrabold text-text-primary tracking-tight">VERGR</h1>
      )}
    </div>
  );
}
