import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';
import BottomNav from '../../components/BottomNav';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function NoSearchResultsScreen() {
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    if (isDesktop) setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);
  const navigate = useNavigate();
  return (
    <div className={isDesktop ? "min-h-screen flex flex-col pb-20" : "screen-container min-h-screen flex flex-col pb-20"}>
      <header className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={()=>navigate(-1)} className="text-white/80"><Icon name="arrow-left" size={24}/></button>
        <div className="flex-1 flex items-center bg-surface rounded-xl px-4 py-3 border border-surface-border">
          <Icon name="search" size={18} className="text-text-secondary mr-2"/>
          <input className="flex-1 bg-transparent text-white text-sm outline-none" placeholder="Search VERGR..."/>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-surface flex items-center justify-center mb-6"><Icon name="search-x" size={36} className="text-text-secondary"/></div>
        <h2 className="text-white text-xl font-bold mb-2">No Results Found</h2>
        <p className="text-text-secondary text-sm text-center max-w-[260px] mb-8">Try a different search term or browse trending topics.</p>
        <button onClick={()=>navigate('/explore')} className="btn-primary px-8 py-3 rounded-xl font-bold">Explore Trending</button>
      </main>
      <BottomNav/>
    </div>
  );
}
