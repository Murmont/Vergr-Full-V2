import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}
