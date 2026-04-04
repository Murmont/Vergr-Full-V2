import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { getSquadAnnouncements, createSquadAnnouncement, getSquadMember, getUser } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';

export default function SquadAnnouncementsScreen() {
  const { squadId } = useParams();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const { isMobile } = useResponsive();
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canPost, setCanPost] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!squadId || !currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        const anns = await getSquadAnnouncements(squadId, 50);
        for (const ann of anns) {
          ann.author = await getUser(ann.authorId);
        }
        setAnnouncements(anns);
        const myMembership = await getSquadMember(squadId, currentUser.uid);
        setCanPost(['president', 'vice_president'].includes(myMembership?.role));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [squadId, currentUser]);

  const handlePost = async () => {
    if (!newContent.trim() || posting) return;
    setPosting(true);
    try {
      await createSquadAnnouncement(squadId, currentUser.uid, newContent.trim());
      setNewContent('');
      showToast('Announcement posted!', 'success');
      const anns = await getSquadAnnouncements(squadId, 50);
      for (const ann of anns) {
        ann.author = await getUser(ann.authorId);
      }
      setAnnouncements(anns);
    } catch (err) {
      showToast('Failed to post', 'error');
    }
    setPosting(false);
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const goToChat = () => navigate(`/squads/${squadId}/chat`);

  return (
    <div className="pb-8">
      {isMobile ? (
        <div className="sticky top-0 z-40 glass-header flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
          <button onClick={goToChat} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Announcements</h1>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 lg:px-6 pt-4 pr-12 lg:pr-16">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors">
            <Icon name="arrow_back" size={24} />
          </button>
          <h1 className="text-white font-syne font-bold text-lg">Announcements</h1>
          <div className="w-6" />
        </div>
      )}

      {canPost && (
        <div className="px-4 pt-4">
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Write an announcement for your squad..."
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none h-20"
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-text-muted">{newContent.length}/500</span>
              <button onClick={handlePost} disabled={!newContent.trim() || posting}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  newContent.trim() && !posting ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-3 text-text-muted'
                }`}>
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="campaign" size={48} className="text-text-muted/30 mx-auto mb-3" />
            <p className="text-text-muted text-sm">No announcements yet</p>
            {canPost && <p className="text-text-muted/60 text-xs mt-1">Post the first announcement for your squad</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map(ann => (
              <div key={ann.id} className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
                <div className="flex items-center gap-2 mb-2">
                  <UserAvatar src={ann.author?.avatar} size="sm" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{ann.author?.displayName || ann.author?.username}</p>
                    <p className="text-[10px] text-text-muted">{formatDate(ann.createdAt)}</p>
                  </div>
                  {ann.pinned && <Icon name="push_pin" filled size={14} className="text-brand-gold" />}
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}