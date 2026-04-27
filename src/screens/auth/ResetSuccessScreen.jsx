import { useNavigate } from 'react-router-dom';
import Icon from '../../components/Icon';

export default function ResetSuccessScreen() {
  const navigate = useNavigate();
  return (
    <div className="screen-container min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 animate-pulse">
        <Icon name="check_circle" size={48} className="text-primary" />
      </div>
      <h1 className="font-syne text-text-primary text-2xl font-bold text-center mb-3">Password Reset!</h1>
      <p className="text-text-secondary text-base text-center max-w-[280px] mb-10">Your password has been successfully updated. You can now log in with your new password.</p>
      <button onClick={() => navigate('/login', { replace: true })} className="btn-primary w-full max-w-[360px] py-4 rounded-2xl text-lg font-bold">Back to Login</button>
    </div>
  );
}
