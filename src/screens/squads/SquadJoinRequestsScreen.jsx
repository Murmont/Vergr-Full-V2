import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { getSquadJoinRequests, handleJoinRequest } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadJoinRequestsScreen() {
  const { squadId } = useParams();
  const { showToast } = useUI();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    if (!squadId) return;
    setLoading(true);
    getSquadJoinRequests(squadId)
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [squadId]);

  const handle = async (request, approved) => {
    setProcessing(request.id);
    try {
      await handleJoinRequest(squadId, request.id, request.userId, approved);
      setRequests(prev => prev.filter(r => r.id !== request.id));
      showToast(approved ? `${request.user?.username} joined!` : 'Request denied', approved ? 'success' : 'info');
    } catch (err) {
      showToast('Failed to process request', 'error');
    }
    setProcessing(null);
  };

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Join Requests</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Join Requests</h1>
          <div className="w-6" />
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="inbox" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No pending join requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(req => (
              <div key={req.id} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar src={req.user?.avatar} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{req.user?.displayName || req.user?.username}</p>
                    <p className="text-xs text-text-muted">@{req.user?.username} · Level {req.user?.level || 1}</p>
                  </div>
                </div>
                {req.message && (
                  <p className="text-text-secondary text-sm mb-3 p-2 rounded-lg bg-surface-2">{req.message}</p>
                )}
                <div className="flex gap-2">
                  <button onClick={() => handle(req, true)} disabled={processing === req.id}
                    className="flex-1 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold">
                    {processing === req.id ? '...' : 'Accept'}
                  </button>
                  <button onClick={() => handle(req, false)} disabled={processing === req.id}
                    className="flex-1 py-2.5 rounded-xl bg-surface-2 border border-white/[0.06] text-text-secondary text-sm font-bold">
                    Deny
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}