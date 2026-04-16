import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getUser, getComments, addComment as addCommentToFirestore } from '../../firebase/firestore';
import { uploadMediaFile } from '../../utils/mediaHelpers';
import { useLayout } from '../../context/LayoutContext';
import PostCard from '../../components/PostCard';
import UserAvatar from '../../components/UserAvatar';
import TopBar from '../../components/TopBar';
import Icon from '../../components/Icon';
import MediaPanel from '../../components/MediaPanel';
import EmojiPicker from '../../components/EmojiPicker';
import { timeAgo } from '../../utils/helpers';

export default function PostDetailScreen() {
  const { postId } = useParams();
  const { currentUser } = useAuth();
  const { profile } = useUser();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const { setRightPanel } = useLayout();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [attachment, setAttachment] = useState(null); // { type, url, thumbnailUrl? }
  const [showMediaPanel, setShowMediaPanel] = useState(null); // 'gifs' | 'stickers' | 'clips' | null
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);

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
    if ((!input.trim() && !attachment) || posting || !currentUser) return;
    setPosting(true);
    try {
      await addCommentToFirestore(postId, currentUser.uid, input.trim(), attachment);
      const cmts = await getComments(postId, 50);
      setComments(cmts);
      setInput('');
      setAttachment(null);
      setShowMediaPanel(null);
      setShowEmoji(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
    setPosting(false);
  };

  const handleMediaSelect = (tab, url, item) => {
    // tab: 'gifs' | 'stickers' | 'clips'
    const type = tab === 'clips' ? 'clip' : tab === 'stickers' ? 'sticker' : 'gif';
    setAttachment({ type, url, thumbnailUrl: item?.preview || null });
    setShowMediaPanel(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const { url } = await uploadMediaFile(file, 'comment_media');
      const isVideo = file.type.startsWith('video/');
      setAttachment({ type: isVideo ? 'video' : 'image', url });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const closeAllPickers = () => {
    setShowMediaPanel(null);
    setShowEmoji(false);
  };

  const renderCommentMedia = (comment) => {
    if (!comment.mediaUrl) return null;
    const t = comment.mediaType;
    if (t === 'video' || t === 'clip') {
      return (
        <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06] max-w-[260px]">
          <video src={comment.mediaUrl} controls playsInline muted className="w-full h-auto max-h-[260px] object-contain bg-black" />
        </div>
      );
    }
    if (t === 'sticker') {
      return <img src={comment.mediaUrl} alt="" className="mt-2 w-28 h-28 object-contain" />;
    }
    return (
      <div className="mt-2 rounded-xl overflow-hidden border border-white/[0.06] max-w-[260px]">
        <img src={comment.mediaUrl} alt="" className="w-full h-auto max-h-[260px] object-cover" loading="lazy" />
      </div>
    );
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm">{comment.author?.displayName || comment.author?.username || 'User'}</span>
                      {comment.author?.isVerified && (
                        <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan flex items-center justify-center">
                          <Icon name="check" size={9} className="text-bg-dark" />
                        </span>
                      )}
                      <span className="text-text-muted text-xs font-dmmono">{timeAgo(comment.createdAt?.toDate ? comment.createdAt.toDate() : comment.createdAt)}</span>
                    </div>
                    {comment.content && <p className="text-text-secondary text-sm break-words">{comment.content}</p>}
                    {renderCommentMedia(comment)}
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

      {/* Media panel (GIFs/Stickers/Clips) */}
      {showMediaPanel && (
        <MediaPanel
          defaultTab={showMediaPanel}
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPanel(null)}
        />
      )}

      {/* Emoji picker */}
      {showEmoji && <EmojiPicker onSelect={(emoji) => setInput(prev => prev + emoji)} onClose={() => setShowEmoji(false)} />}

      {/* Input bar */}
      <div className="sticky bottom-0 glass-header border-t border-white/[0.04] px-2 pt-2 pb-2">
        {/* Attachment preview */}
        {attachment && (
          <div className="flex items-center gap-2 mb-2 px-2">
            <div className="relative rounded-lg overflow-hidden border border-white/[0.08] max-w-[100px]">
              {attachment.type === 'video' || attachment.type === 'clip' ? (
                <video src={attachment.url} muted className="w-20 h-20 object-cover bg-black" />
              ) : (
                <img src={attachment.thumbnailUrl || attachment.url} alt="" className="w-20 h-20 object-cover" />
              )}
              <button
                onClick={() => setAttachment(null)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
              >
                <Icon name="close" size={12} className="text-white" />
              </button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={handleFileSelect}
        />

        <div className="flex items-center gap-1.5">
          <UserAvatar src={profile?.avatar} size={32} />

          <div className="flex-1 flex items-center bg-surface-2 border border-white/[0.06] rounded-full focus-within:border-brand-cyan/40 transition-colors">
            <button
              onClick={() => { const on = !showEmoji; closeAllPickers(); if (on) setShowEmoji(true); }}
              className="w-9 h-9 shrink-0 flex items-center justify-center"
            >
              <Icon name={showEmoji ? 'keyboard' : 'sentiment_satisfied'} size={19} className={showEmoji ? 'text-brand-cyan' : 'text-text-muted'} />
            </button>
            <input
              type="text"
              placeholder="Add a comment..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddComment()}
              className="flex-1 bg-transparent py-2 pr-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none min-w-0"
            />
            <div className="flex items-center shrink-0 pr-1">
              <button
                onClick={() => { const on = showMediaPanel !== 'gifs'; closeAllPickers(); if (on) setShowMediaPanel('gifs'); }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="gif_box" size={19} className={showMediaPanel === 'gifs' ? 'text-brand-cyan' : 'text-text-muted'} />
              </button>
              <button
                onClick={() => { const on = showMediaPanel !== 'stickers'; closeAllPickers(); if (on) setShowMediaPanel('stickers'); }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="sticky_note_2" size={18} className={showMediaPanel === 'stickers' ? 'text-brand-cyan' : 'text-text-muted'} />
              </button>
              <button
                onClick={() => { const on = showMediaPanel !== 'clips'; closeAllPickers(); if (on) setShowMediaPanel('clips'); }}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name="movie" size={18} className={showMediaPanel === 'clips' ? 'text-brand-cyan' : 'text-text-muted'} />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-8 h-8 flex items-center justify-center"
              >
                <Icon name={uploading ? 'hourglass_empty' : 'photo_camera'} size={18} className="text-text-muted" />
              </button>
            </div>
          </div>

          <button
            onClick={handleAddComment}
            disabled={(!input.trim() && !attachment) || posting}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              (input.trim() || attachment) && !posting ? 'bg-brand-cyan text-bg-dark' : 'bg-surface-2 text-text-muted'
            }`}
          >
            <Icon name={posting ? 'hourglass_empty' : 'send'} size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
