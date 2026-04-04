import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function TournamentPrizePoolScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const location = useLocation();
  const { prizePool } = location.state || {};
  const total = prizePool || 0;
  const distribution = [
    { place: '1st', pct: 50, color: '#FFD700' },
    { place: '2nd', pct: 25, color: '#C0C0C0' },
    { place: '3rd', pct: 15, color: '#CD7F32' },
    { place: '4th', pct: 10, color: '#6B7280' },
  ];

  return (
    <div className={isDesktop ? "min-h-screen pb-8" : "screen-container min-h-screen pb-8"}>
      <TopBar title="Prize Pool" showBack />
      <div className="px-4 py-4">
        <div className="p-6 rounded-2xl bg-surface-1 border border-white/[0.06] text-center mb-6">
          <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Total Prize Pool</p>
          <p className="font-dmmono text-3xl font-bold text-brand-gold">{total.toLocaleString()}</p>
        </div>
        <h3 className="font-syne font-bold text-base mb-3">Distribution</h3>
        <div className="space-y-3">
          {distribution.map(d => (
            <div key={d.place} className="flex items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: d.color+'20' }}>
                <span className="font-bold text-sm" style={{ color: d.color }}>{d.place}</span>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${d.pct}%`, backgroundColor: d.color }} />
                </div>
              </div>
              <span className="font-dmmono font-bold text-sm text-brand-gold">{Math.round(total * d.pct / 100).toLocaleString()}</span>
              <span className="text-text-muted text-xs w-8">{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
