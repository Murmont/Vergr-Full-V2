import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser, getComments, addComment as addCommentToFirestore } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import PostCard from '../../components/PostCard';
import UserAvatar from '../../components/UserAvatar';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import { timeAgo } from '../../utils/helpers';

export default function PostDetailScreen() {
  const { postId } = useParams();
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const { setRightPanel } = useLayout();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    setRightPanel(null);
    return () => setRightPanel(null);
  }, [setRightPanel]);

  useEffect(() => {
    if (!postId) return;
    const load = async () => {
      setLoading(true);
      try {
        const postSnap = await getDoc(doc(db, 'posts', postId));
        if (postSnap.exists()) {
          const postData = { id: postSnap.id, ...postSnap.data() };
          postData.author = await getUser(postData.authorId);
          setPost(postData);
        }
        const cmts = await getComments(postId, 50);
        setComments(cmts);
      } catch (err) {
        console.error('Failed to load post:', err);
      }
      setLoading(false);
    };
    load();
  }, [postId]);

  const handleAddComment = async () => {
    if (!input.trim() || posting || !currentUser) return;
    setPosting(true);
    try {
      await addCommentToFirestore(postId, currentUser.uid, input.trim());
      const cmts = await getComments(postId, 50);
      setComments(cmts);
      setInput('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
    setPosting(false);
  };

  if (loading) return (
    <div className="min-h-screen">
      <TopBar title="Post" showBack />
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!post) return (
    <div className="min-h-screen">
      <TopBar title="Post" showBack />
      <div className="flex flex-col items-center py-20">
        <Icon name="error_outline" size={48} className="text-text-muted/30 mb-3" />
        <p className="text-text-muted text-sm">Post not found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar title="Post" showBack />

      <div className="flex-1 overflow-y-auto">
        <PostCard post={post} onDeleted={() => navigate(-1)} />

        <div className="px-4 py-3 border-t border-white/[0.03]">
          <h3 className="font-syne font-bold text-sm mb-4">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h3>

          {comments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm">No comments yet. Be the first!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <button onClick={() => navigate(`/user/${comment.author?.id || comment.authorId}`)} className="shrink-0">
                    <UserAvatar src={comment.author?.avatar} size={32} />
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{comment.author?.displayName || comment.author?.username || 'User'}</span>
                      {comment.author?.isVerified && (
                        <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan flex items-center justify-center">
                          <Icon name="check" size={9} className="text-bg-dark" />
                        </span>
                      )}
                      <span className="text-text-muted text-xs font-dmmono">{timeAgo(comment.createdAt?.toDate ? comment.createdAt.toDate() : comment.createdAt)}</span>
                    </div>
                    <p className="text-text-secondary text-sm">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <button className="flex items-center gap-1 text-text-muted hover:text-brand-ember transition-colors">
                        <Icon name="favorite_border" size={14} />
                        <span className="text-xs">{comment.likeCount || 0}</span>
                      </button>
                      <button className="text-text-muted text-xs hover:text-text-secondary transition-colors">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 glass-header border-t border-white/[0.04] p-3 flex items-center gap-2">
        <UserAvatar src={profile?.avatar} size={32} />
        <input
          type="text"
          placeholder="Add a comment..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddComment()}
          className="flex-1 bg-surface-2 border border-white/[0.06] rounded-full py-2.5 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none"
        />
        <button
          onClick={handleAddComment}
          disabled={!input.trim() || posting}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
            input.trim() && !posting ? 'bg-brand-cyan text-bg-dark' : 'text-text-muted'
          }`}>
          {posting ? '...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
