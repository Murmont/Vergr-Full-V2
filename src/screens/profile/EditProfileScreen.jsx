import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { useAuth } from '../../context/AuthContext';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';
import { uploadBanner, uploadAvatar } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import UserAvatar from '../../components/UserAvatar';
import Icon from '../../components/Icon';

export default function EditProfileScreen() {
  const { profile, updateProfile } = useUser();
  const { currentUser } = useAuth();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();
  const bannerRef = useRef(null);
  const avatarRef = useRef(null);
  
  const [form, setForm] = useState({
    displayName: profile?.displayName || '',
    bio: profile?.bio || '',
    location: profile?.location || '',
  });
  const [bannerPreview, setBannerPreview] = useState(profile?.banner || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || '');
  const [pendingBanner, setPendingBanner] = useState(null);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign]);

  const handleBannerSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPendingBanner(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setPendingAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = { ...form };
      if (pendingBanner) {
        const bannerUrl = await uploadBanner(currentUser.uid, pendingBanner);
        updates.banner = bannerUrl;
      }
      if (pendingAvatar) {
        const avatarUrl = await uploadAvatar(currentUser.uid, pendingAvatar);
        updates.avatar = avatarUrl;
      }
      await updateProfile(updates);
      showToast('Profile updated!', 'success');
      navigate(-1);
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const bannerSection = (
    <div className="relative h-36 lg:h-44 bg-surface-2 overflow-hidden cursor-pointer group" onClick={() => bannerRef.current?.click()}>
      {bannerPreview ? (
        <img src={bannerPreview} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-surface-2 flex items-center justify-center">
          <Icon name="add_photo_alternate" size={28} className="text-text-muted" />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <Icon name="photo_camera" size={20} className="text-white" />
        <span className="text-white text-sm font-medium">Change Banner</span>
      </div>
      <input ref={bannerRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleBannerSelect} />
    </div>
  );

  const formFields = (
    <div className="space-y-5">
      <div>
        <label className="text-text-muted text-[11px] uppercase font-semibold tracking-wider mb-1.5 block">Display Name</label>
        <input type="text" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} 
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-text-primary text-sm focus:border-brand-cyan/40 focus:outline-none transition-colors" />
      </div>
      <div>
        <label className="text-text-muted text-[11px] uppercase font-semibold tracking-wider mb-1.5 block">Bio</label>
        <textarea value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} maxLength={150}
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-text-primary text-sm h-28 resize-none focus:border-brand-cyan/40 focus:outline-none transition-colors" />
        <p className="text-text-muted text-[10px] mt-1 text-right font-dmmono">{form.bio.length}/150</p>
      </div>
      <div>
        <label className="text-text-muted text-[11px] uppercase font-semibold tracking-wider mb-1.5 block">Location</label>
        <input type="text" value={form.location} onChange={e => setForm({...form, location: e.target.value})} 
          placeholder="City, Country"
          className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-text-primary text-sm placeholder:text-text-muted focus:border-brand-cyan/40 focus:outline-none transition-colors" />
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <div className="pb-8">
        <TopBar title="Edit Profile" showBack actions={
          <button onClick={save} disabled={saving} className="text-brand-cyan font-semibold text-sm disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        } />
        {bannerSection}
        <div className="flex gap-8 px-6 pt-4 pb-8">
          <div className="flex flex-col items-center gap-3 shrink-0 -mt-14 relative z-10">
            <div className="border-4 border-bg-dark rounded-full cursor-pointer relative group" onClick={() => avatarRef.current?.click()}>
              <UserAvatar src={avatarPreview} size={110} />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Icon name="photo_camera" size={22} className="text-white" />
              </div>
            </div>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarSelect} />
          </div>
          <div className="flex-1 max-w-lg pt-4">
            {formFields}
            <button onClick={save} disabled={saving} className="btn-primary mt-6 max-w-xs">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container min-h-screen pb-8">
      <TopBar title="Edit Profile" showBack actions={
        <button onClick={save} disabled={saving} className="text-brand-cyan font-semibold text-sm disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      } />
      {bannerSection}
      <div className="flex flex-col items-center -mt-12 relative z-10 mb-4">
        <div className="border-4 border-bg-dark rounded-full cursor-pointer relative group" onClick={() => avatarRef.current?.click()}>
          <UserAvatar src={avatarPreview} size={80} />
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Icon name="photo_camera" size={18} className="text-white" />
          </div>
        </div>
        <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleAvatarSelect} />
      </div>
      <div className="px-4 pb-6">
        {formFields}
      </div>
    </div>
  );
}
