import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { useLayout } from '../../context/LayoutContext';
import Icon from '../../components/Icon';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';

export default function AdCenterScreen() {
  const navigate = useNavigate();
  const { profile } = useUser();
  const { showToast } = useUI();
  const { setRightPanel, setContentAlign } = useLayout();
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    targetUrl: '',
    budget: 100,
    status: 'active',
  });

  useEffect(() => {
    setRightPanel(null);
    setContentAlign('left');
    return () => {
      setRightPanel(null);
      setContentAlign('center');
    };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchAds = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'ads'), where('userId', '==', auth.currentUser.uid));
        const snap = await getDocs(q);
        setAds(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAds();
  }, []);

  const handleCreate = async () => {
    if (!formData.title || !formData.targetUrl) {
      showToast('Title and URL are required', 'error');
      return;
    }
    try {
      const adData = {
        ...formData,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        impressions: 0,
        clicks: 0,
      };
      const docRef = await addDoc(collection(db, 'ads'), adData);
      setAds([{ id: docRef.id, ...adData }, ...ads]);
      showToast('Ad created successfully', 'success');
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      showToast('Failed to create ad', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editingAd) return;
    try {
      await updateDoc(doc(db, 'ads', editingAd.id), { ...formData });
      setAds(ads.map(ad => ad.id === editingAd.id ? { ...ad, ...formData } : ad));
      showToast('Ad updated', 'success');
      setEditingAd(null);
      resetForm();
    } catch (err) {
      showToast('Update failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this ad?')) return;
    try {
      await deleteDoc(doc(db, 'ads', id));
      setAds(ads.filter(ad => ad.id !== id));
      showToast('Ad deleted', 'success');
    } catch (err) {
      showToast('Delete failed', 'error');
    }
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', imageUrl: '', targetUrl: '', budget: 100, status: 'active' });
    setEditingAd(null);
  };

  return (
    <div className="min-h-screen bg-bg-dark pb-10">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-header px-4 py-3 flex items-center justify-between border-b border-white/[0.04]">
        <button onClick={() => navigate(-1)} className="text-text-muted hover:text-white">
          <Icon name="arrow_back" size={24} />
        </button>
        <h1 className="font-syne font-bold text-xl text-white">Ad Center</h1>
        <button onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-brand-cyan text-bg-dark px-4 py-1.5 rounded-full text-xs font-black uppercase">
          Create Ad
        </button>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4">
        <div className="bg-surface-1 rounded-2xl border border-white/[0.06] p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">Total Spend</p>
          <p className="text-2xl font-bold text-white mt-1">${ads.reduce((sum, ad) => sum + (ad.budget || 0), 0)}</p>
        </div>
        <div className="bg-surface-1 rounded-2xl border border-white/[0.06] p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">Total Impressions</p>
          <p className="text-2xl font-bold text-white mt-1">{ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0).toLocaleString()}</p>
        </div>
        <div className="bg-surface-1 rounded-2xl border border-white/[0.06] p-4">
          <p className="text-text-muted text-xs uppercase tracking-wider">CTR</p>
          <p className="text-2xl font-bold text-white mt-1">
            {(() => {
              const totalImps = ads.reduce((s, ad) => s + (ad.impressions || 0), 0);
              const totalClicks = ads.reduce((s, ad) => s + (ad.clicks || 0), 0);
              return totalImps ? ((totalClicks / totalImps) * 100).toFixed(1) : '0';
            })}%
          </p>
        </div>
      </div>

      {/* Ads list */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" /></div>
        ) : ads.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <Icon name="campaign" size={32} className="text-text-muted" />
            </div>
            <p className="text-text-muted">No ads yet. Create your first campaign.</p>
          </div>
        ) : (
          ads.map(ad => (
            <div key={ad.id} className="bg-surface-1 rounded-2xl border border-white/[0.06] p-4 flex flex-col sm:flex-row gap-4">
              {ad.imageUrl && <img src={ad.imageUrl} alt="" className="w-24 h-24 object-cover rounded-xl" />}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{ad.title}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${ad.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{ad.status}</span>
                </div>
                <p className="text-text-secondary text-sm mt-1 line-clamp-2">{ad.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-text-muted">
                  <span>Budget: ${ad.budget}</span>
                  <span>Impressions: {ad.impressions?.toLocaleString() || 0}</span>
                  <span>Clicks: {ad.clicks || 0}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditingAd(ad); setFormData(ad); setShowCreateModal(true); }} className="text-brand-cyan p-2"><Icon name="edit" size={18} /></button>
                <button onClick={() => handleDelete(ad.id)} className="text-brand-ember p-2"><Icon name="delete" size={18} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div className="bg-surface-1 rounded-2xl w-full max-w-md p-6 border border-white/[0.06]" onClick={e => e.stopPropagation()}>
            <h2 className="font-syne font-bold text-white text-xl mb-4">{editingAd ? 'Edit Ad' : 'Create Ad'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Ad Title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm" />
              <textarea placeholder="Description (optional)" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm" />
              <input type="url" placeholder="Image URL (optional)" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm" />
              <input type="url" placeholder="Target URL (required)" value={formData.targetUrl} onChange={e => setFormData({ ...formData, targetUrl: e.target.value })} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm" />
              <div className="flex gap-4">
                <label className="flex-1 text-text-muted text-xs">Budget ($)</label>
                <input type="number" min="1" value={formData.budget} onChange={e => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })} className="w-24 bg-surface-2 border border-white/[0.06] rounded-xl px-3 py-2 text-white text-sm" />
              </div>
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm">
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="flex-1 py-2 rounded-xl bg-surface-2 text-white">Cancel</button>
              <button onClick={editingAd ? handleUpdate : handleCreate} className="flex-1 py-2 rounded-xl bg-brand-cyan text-bg-dark font-bold">{editingAd ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}