import { Outlet } from 'react-router-dom';
import ResponsiveLayout from '../components/ResponsiveLayout';
import { useLayout } from '../context/LayoutContext';

export default function MainLayout() {
  const { rightPanel, contentAlign, layout } = useLayout();
  return (
    <ResponsiveLayout rightPanel={rightPanel} centered={contentAlign === 'center'} layout={layout}>
      <Outlet />
    </ResponsiveLayout>
  );
}