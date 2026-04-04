import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { auth } from '../../firebase/config';
import { createPost, uploadPostMedia } from '../../firebase/firestore';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import { getTierConfig, checkFileSizeAccess } from '../../utils/Tiersystem';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';

const MAX_PHOTOS = 10;

export default function CreatePhotoPostScreen() {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
  const { profile } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { setRightPanel, setContentAlign } = useLayout();
  const { isDesktop } = useResponsive();
  const userTier = profile?.tier || 'free';
  const tierConfig = getTierConfig(userTier);

  useEffect(() => { setRightPanel(null); setContentAlign(isDesktop ? 'left' : 'center'); return () => { setRightPanel(null); setContentAlign('center'); }; }, [setRightPanel, setContentAlign, isDesktop]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const remaining = MAX_PHOTOS - mediaFiles.length;
    if (remaining <= 0) { showToast(`Maximum ${MAX_PHOTOS} photos`, 'error'); return; }
    const newMedia = [];
    for (const file of files.slice(0, remaining)) {
      const sizeCheck = checkFileSizeAccess(userTier, file.size);
      if (!sizeCheck.allowed) { showToast(sizeCheck.message, 'error'); continue; }
      newMedia.push({ file, preview: URL.createObjectURL(file), id: Math.random().toString(36).slice(2, 10) });
    }
    setMediaFiles(prev => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removePhoto = (id) => { setMediaFiles(prev => { const item = prev.find(m => m.id === id); if (item) URL.revokeObjectURL(item.preview); return prev.filter(m => m.id !== id); }); };

  const handlePost = async () => {
    if (mediaFiles.length === 0 || loading) return;
    setLoading(true); setUploadProgress(0);
    try {
      const postId = await createPost(auth.currentUser.uid, { content: content.trim(), type: mediaFiles.length > 1 ? 'carousel' : 'photo', hashtags: (content.match(/#\w+/g) || []).map(t => t.slice(1).toLowerCase()) });
      for (let i = 0; i < mediaFiles.length; i++) { await uploadPostMedia(postId, mediaFiles[i].file); setUploadProgress(Math.round(((i + 1) / mediaFiles.length) * 100)); }
      showToast('Posted!', 'success'); navigate(-1);
    } catch (err) { console.error(err); showToast('Failed to publish', 'error'); }
    setLoading(false); mediaFiles.forEach(m => URL.revokeObjectURL(m.preview));
  };

  const getGridClass = () => { const c = mediaFiles.length; if (c <= 1) return 'grid-cols-1 max-w-md'; if (c <= 4) return 'grid-cols-2'; return 'grid-cols-3'; };

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark">
      <header className="sticky top-0 z-40 bg-bg-dark/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-2 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-white transition-colors"><Icon name="arrow_back" size={20} /></button>
            <div><h1 className="font-syne font-bold text-base text-white">Photo Post</h1><p className="text-text-muted text-[10px] font-dmmono">{mediaFiles.length}/{MAX_PHOTOS} photos</p></div>
          </div>
          <button onClick={handlePost} disabled={loading || mediaFiles.length === 0} className="bg-brand-cyan text-bg-dark px-6 py-2 rounded-full font-bold text-sm disabled:opacity-30 hover:brightness-110 active:scale-[0.97] transition-all ">
            {loading ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin" /><span>{uploadProgress}%</span></div> : 'Post'}
          </button>
        </div>
      </header>
      <div className={`flex-1 overflow-y-auto ${isDesktop ? 'flex gap-6 px-6 py-5' : 'px-4 py-4'}`}>
        <div className={isDesktop ? 'w-[340px] shrink-0' : ''}>
          <div className="flex gap-3 mb-4">
            <UserAvatar src={profile?.avatar || profile?.photoURL} size={40} />
            <div className="flex-1">
              <p className="text-brand-cyan text-xs font-dmmono mb-1">@{profile?.username || 'you'}</p>
              <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write a caption..." className="w-full bg-transparent text-text-primary text-sm leading-relaxed placeholder:text-text-muted/60 outline-none resize-none min-h-[80px]" maxLength={2000} />
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-xl bg-surface-2/50 border border-white/[0.04] mb-4">
            <div className="flex items-center justify-between"><span className="text-text-muted text-[10px] uppercase tracking-wider">Quality</span><span className="text-brand-cyan text-[11px] font-dmmono font-bold">{tierConfig.imageMaxDim === Infinity ? 'Original 4K' : `${tierConfig.imageMaxDim}p`}</span></div>
            <div className="flex items-center justify-between mt-1"><span className="text-text-muted text-[10px] uppercase tracking-wider">Max upload</span><span className="text-text-secondary text-[11px] font-dmmono">{tierConfig.maxFileUploadMB}MB</span></div>
          </div>
        </div>
        <div className="flex-1">
          {mediaFiles.length > 0 ? (
            <div className={`grid ${getGridClass()} gap-2`}>
              {mediaFiles.map((media, idx) => (
                <div key={media.id} className="relative group rounded-2xl overflow-hidden border border-white/[0.06] bg-surface-1 aspect-square max-h-[280px]">
                  <img src={media.preview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                    <button onClick={() => removePhoto(media.id)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-brand-ember/80 backdrop-blur-sm flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"><Icon name="close" size={14} /></button>
                    <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"><span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-white text-[10px] font-dmmono font-bold">{idx + 1}/{mediaFiles.length}</span></div>
                  </div>
                </div>
              ))}
              {mediaFiles.length < MAX_PHOTOS && (
                <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-2xl border-2 border-dashed border-white/[0.06] bg-surface-1/30 flex flex-col items-center justify-center gap-2 hover:border-brand-violet/40 hover:bg-brand-violet/5 transition-all group">
                  <Icon name="add" size={22} className="text-text-muted group-hover:text-brand-violet transition-colors" />
                  <span className="text-text-muted text-[10px] font-dmmono group-hover:text-brand-violet transition-colors">Add Photo</span>
                </button>
              )}
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-video max-h-[400px] rounded-2xl border-2 border-dashed border-white/[0.06] bg-surface-1/20 flex flex-col items-center justify-center gap-4 hover:border-brand-violet/40 hover:bg-brand-violet/5 transition-all group cursor-pointer">
              <div className="w-16 h-16 rounded-2xl bg-brand-violet/10 border border-brand-violet/20 flex items-center justify-center group-hover:scale-105 transition-transform"><Icon name="add_photo_alternate" size={32} className="text-brand-violet" /></div>
              <div className="text-center"><p className="text-text-primary font-syne font-bold text-sm">Add Photos</p><p className="text-text-muted text-xs mt-1">Up to {MAX_PHOTOS} photos · {tierConfig.maxFileUploadMB}MB each</p></div>
            </button>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" multiple />
    </div>
  );
}
