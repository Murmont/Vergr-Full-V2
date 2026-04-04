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

const DURATION_LIMITS = { free: 60, lite: 180, pro: 600 };

export default function CreateClipPostScreen() {
  const [content, setContent] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
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
  const maxDuration = DURATION_LIMITS[userTier] || 60;
  const nextTier = userTier === 'free' ? 'lite' : userTier === 'lite' ? 'pro' : null;

  useEffect(() => { setRightPanel(null); setContentAlign(isDesktop ? 'left' : 'center'); return () => { setRightPanel(null); setContentAlign('center'); }; }, [setRightPanel, setContentAlign, isDesktop]);

  const fmt = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const sizeCheck = checkFileSizeAccess(userTier, file.size);
    if (!sizeCheck.allowed) { showToast(sizeCheck.message, 'error'); return; }
    const url = URL.createObjectURL(file);
    const v = document.createElement('video'); v.preload = 'metadata';
    v.onloadedmetadata = () => { if (v.duration > maxDuration) { URL.revokeObjectURL(url); showToast(`Video is ${fmt(v.duration)} — max ${fmt(maxDuration)}${nextTier ? `. Upgrade to ${nextTier} for longer clips.` : ''}`, 'error'); return; } setVideoDuration(v.duration); setVideoFile({ file, preview: url }); };
    v.src = url; e.target.value = '';
  };

  const handlePost = async () => {
    if (!videoFile || loading) return;
    setLoading(true); setUploadProgress(0);
    try {
      const postId = await createPost(auth.currentUser.uid, { content: content.trim(), type: videoDuration <= 60 ? 'clip' : 'video', hashtags: (content.match(/#\w+/g) || []).map(t => t.slice(1).toLowerCase()) });
      const iv = setInterval(() => setUploadProgress(p => Math.min(p + 3, 90)), 200);
      await uploadPostMedia(postId, videoFile.file); clearInterval(iv); setUploadProgress(100);
      showToast('Clip posted!', 'success'); navigate(-1);
    } catch (err) { console.error(err); showToast('Failed to upload', 'error'); }
    setLoading(false); if (videoFile) URL.revokeObjectURL(videoFile.preview);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark">
      <header className="sticky top-0 z-40 bg-bg-dark/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-surface-2 border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-white transition-colors"><Icon name="arrow_back" size={20} /></button>
            <div><h1 className="font-syne font-bold text-base text-white">Video Clip</h1><p className="text-text-muted text-[10px] font-dmmono">Max {fmt(maxDuration)} · {tierConfig.videoMaxHeight === Infinity ? '4K' : `${tierConfig.videoMaxHeight}p`}</p></div>
          </div>
          <button onClick={handlePost} disabled={loading || !videoFile} className="bg-brand-cyan text-bg-dark px-6 py-2 rounded-full font-bold text-sm disabled:opacity-30 hover:brightness-110 active:scale-[0.97] transition-all">
            {loading ? <div className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-bg-dark/30 border-t-bg-dark rounded-full animate-spin" /><span>{uploadProgress}%</span></div> : 'Post'}
          </button>
        </div>
        {loading && <div className="h-0.5 bg-surface-3"><div className="h-full bg-brand-cyan transition-all duration-300" style={{ width: `${uploadProgress}%` }} /></div>}
      </header>
      <div className={`flex-1 overflow-y-auto ${isDesktop ? 'flex gap-6 px-6 py-5' : 'px-4 py-4'}`}>
        <div className={isDesktop ? 'w-[340px] shrink-0 flex flex-col gap-4' : 'mb-4'}>
          <div className="flex gap-3"><UserAvatar src={profile?.avatar} size={40} /><div className="flex-1"><p className="text-brand-cyan text-xs font-dmmono mb-1">@{profile?.username || 'you'}</p><textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Describe your clip..." className="w-full bg-transparent text-text-primary text-sm leading-relaxed placeholder:text-text-muted/50 outline-none resize-none min-h-[80px]" maxLength={500} /></div></div>
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06]">
            <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mb-3">Your limits</p>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon name="timer" size={14} className="text-text-muted" /><span className="text-text-secondary text-xs">Duration</span></div><span className="text-brand-cyan text-xs font-dmmono font-bold">{fmt(maxDuration)}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon name="hd" size={14} className="text-text-muted" /><span className="text-text-secondary text-xs">Quality</span></div><span className="text-brand-cyan text-xs font-dmmono font-bold">{tierConfig.videoMaxHeight === Infinity ? '4K' : `${tierConfig.videoMaxHeight}p`}</span></div>
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Icon name="cloud_upload" size={14} className="text-text-muted" /><span className="text-text-secondary text-xs">Max size</span></div><span className="text-text-secondary text-xs font-dmmono">{tierConfig.maxFileUploadMB}MB</span></div>
            </div>
            {nextTier && <button onClick={() => navigate('/settings/subscription')} className="w-full mt-3 py-2 rounded-xl bg-brand-cyan/[0.06] border border-brand-cyan/20 text-brand-cyan text-[11px] font-bold hover:bg-brand-cyan/10 transition-colors">Upgrade for more</button>}
          </div>
        </div>
        <div className="flex-1">
          {videoFile ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black">
              <video src={videoFile.preview} controls playsInline className="w-full max-h-[500px] object-contain" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm"><span className="text-white text-xs font-dmmono font-bold">{fmt(videoDuration)}</span></div>
              <button onClick={() => { URL.revokeObjectURL(videoFile.preview); setVideoFile(null); setVideoDuration(0); }} className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-brand-ember/80 flex items-center justify-center text-white"><Icon name="close" size={16} /></button>
              <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-sm"><span className="text-text-muted text-[10px] font-dmmono">{(videoFile.file.size / (1024*1024)).toFixed(1)}MB</span></div>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full aspect-[9/16] max-h-[500px] rounded-2xl border-2 border-dashed border-white/[0.06] bg-surface-1/20 flex flex-col items-center justify-center gap-4 hover:border-brand-ember/40 hover:bg-brand-ember/5 transition-all group cursor-pointer">
              <div className="w-20 h-20 rounded-3xl bg-brand-ember/10 border border-brand-ember/20 flex items-center justify-center group-hover:scale-105 transition-transform"><Icon name="videocam" size={36} className="text-brand-ember" /></div>
              <div className="text-center"><p className="text-text-primary font-syne font-bold">Upload a Clip</p><p className="text-text-muted text-xs mt-1">Up to {fmt(maxDuration)} · {tierConfig.videoMaxHeight === Infinity ? '4K' : `${tierConfig.videoMaxHeight}p`} · {tierConfig.maxFileUploadMB}MB max</p></div>
            </button>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="video/*" />
    </div>
  );
}
