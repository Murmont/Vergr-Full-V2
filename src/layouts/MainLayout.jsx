import { Outlet } from 'react-router-dom';
import ResponsiveLayout from '../components/ResponsiveLayout';
import { useLayout } from '../context/LayoutContext';

export default function MainLayout() {
  const { rightPanel, contentAlign } = useLayout();
  return (
    <ResponsiveLayout rightPanel={rightPanel} centered={contentAlign === 'center'}>
      <Outlet />
    </ResponsiveLayout>
  );
}