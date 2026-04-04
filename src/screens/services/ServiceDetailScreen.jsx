import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getService, purchaseService, getServiceOrders, deliverServiceOrder, approveServiceOrder, disputeServiceOrder } from '../../firebase/firestore';
import { getVPLevel, getGemRate, SERVICE_CATEGORIES } from '../../utils/vpSystem';
import Icon from '../../components/Icon';
import UserAvatar from '../../components/UserAvatar';
import VPLevelBadge from '../../components/VPLevelBadge';
import TopBar from '../../components/TopBar';
import { useLayout } from '../../context/LayoutContext';
import useResponsive from '../../hooks/useResponsive';

export default function ServiceDetailScreen() {
  const { id } = useParams();
  const [service, setService] = useState(null);
  const [order, setOrder] = useState(null); // existing order if any
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliveryMsg, setDeliveryMsg] = useState('');
  const [showDeliverForm, setShowDeliverForm] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const { currentUser } = useAuth();
  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isDesktop } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(null);
    setContentAlign(isDesktop ? 'left' : 'center');
    return () => { setRightPanel(null); setContentAlign('center'); };
  }, [setRightPanel, setContentAlign, isDesktop]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const s = await getService(id);
        setService(s);
        // Check if current user has an active order for this service
        if (currentUser) {
          const orders = await getServiceOrders(currentUser.uid, 'buyer', 50);
          const existing = orders.find(o => o.serviceId === id && ['in_progress', 'delivered'].includes(o.status));
          setOrder(existing || null);
          // Also check if user is the seller with pending orders
          if (!existing && s?.sellerId === currentUser.uid) {
            const sellerOrders = await getServiceOrders(currentUser.uid, 'seller', 50);
            const activeOrder = sellerOrders.find(o => o.serviceId === id && ['in_progress', 'delivered'].includes(o.status));
            setOrder(activeOrder || null);
          }
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, [id, currentUser]);

  const handlePurchase = async () => {
    if (!currentUser || purchasing) return;
    if ((wallet?.balance || 0) < service.priceCoins) {
      showToast('Not enough coins', 'error');
      return;
    }
    setPurchasing(true);
    try {
      const orderId = await purchaseService(currentUser.uid, service.id);
      showToast('Service purchased! Seller has been notified.', 'success');
      // Reload to show order status
      const orders = await getServiceOrders(currentUser.uid, 'buyer', 50);
      const newOrder = orders.find(o => o.serviceId === id);
      setOrder(newOrder || null);
    } catch (err) {
      showToast(err.message || 'Purchase failed', 'error');
    }
    setPurchasing(false);
  };

  const handleDeliver = async () => {
    if (!order || delivering) return;
    setDelivering(true);
    try {
      await deliverServiceOrder(order.id, currentUser.uid, deliveryMsg);
      showToast('Marked as delivered!', 'success');
      setOrder(prev => ({ ...prev, status: 'delivered' }));
      setShowDeliverForm(false);
    } catch (err) { showToast(err.message, 'error'); }
    setDelivering(false);
  };

  const handleApprove = async () => {
    if (!order) return;
    try {
      await approveServiceOrder(order.id, currentUser.uid);
      showToast('Order approved! Seller received gems.', 'success');
      setOrder(prev => ({ ...prev, status: 'completed' }));
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDispute = async () => {
    if (!order) return;
    try {
      await disputeServiceOrder(order.id, currentUser.uid, disputeReason);
      showToast('Dispute filed — coins refunded.', 'success');
      setOrder(prev => ({ ...prev, status: 'disputed' }));
      setShowDisputeForm(false);
    } catch (err) { showToast(err.message, 'error'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen"><TopBar title="Service" showBack />
        <div className="text-center py-20"><p className="text-text-muted">Service not found</p></div>
      </div>
    );
  }

  const cat = SERVICE_CATEGORIES.find(c => c.id === service.category);
  const isOwner = currentUser?.uid === service.sellerId;
  const isBuyer = order?.buyerId === currentUser?.uid;
  const isSeller = order?.sellerId === currentUser?.uid;
  const sellerVP = service.seller?.vp || 0;
  const gemRate = getGemRate(sellerVP);
  const sellerGems = Math.round(service.priceCoins * gemRate);

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <TopBar title="Service" showBack />

      <div className={`px-4 py-4 space-y-4 ${isDesktop ? 'max-w-2xl' : ''}`}>
        {/* Service info */}
        <div className="p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-3">
            <Icon name={cat?.icon || 'work'} size={16} className="text-brand-cyan" />
            <span className="text-brand-cyan text-[10px] font-bold uppercase tracking-wider">{cat?.label || 'Service'}</span>
          </div>
          <h2 className="font-syne text-xl font-bold text-text-primary mb-2">{service.title}</h2>
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">{service.description}</p>

          {/* Seller */}
          <button onClick={() => navigate(`/user/${service.sellerId}`)}
            className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-surface-2/50 hover:bg-surface-2 transition-colors w-full text-left">
            <UserAvatar src={service.seller?.avatar} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm font-bold truncate">{service.seller?.displayName || 'User'}</p>
              <p className="text-text-muted text-xs font-dmmono">@{service.seller?.username}</p>
            </div>
            <VPLevelBadge vp={sellerVP} size="xs" />
          </button>

          {/* Pricing */}
          <div className="mt-4 p-4 rounded-xl bg-bg-dark/50 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-xs">Price</span>
              <span className="text-brand-gold text-lg font-bold font-dmmono">{service.priceCoins} <span className="text-text-muted text-xs">coins</span></span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-xs">Seller receives</span>
              <span className="text-brand-cyan font-bold font-dmmono">◆ {sellerGems} <span className="text-text-muted text-xs">gems</span></span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-xs">Delivery</span>
              <span className="text-text-primary text-sm font-dmmono">{service.deliveryDays} day{service.deliveryDays !== 1 ? 's' : ''}</span>
            </div>
            {service.completedCount > 0 && (
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
                <span className="text-text-secondary text-xs">Completed</span>
                <span className="text-text-primary text-sm font-dmmono">{service.completedCount} orders</span>
              </div>
            )}
          </div>
        </div>

        {/* Order status / Actions */}
        {order ? (
          <div className="p-4 rounded-2xl border border-white/[0.06] bg-surface-1">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${
                order.status === 'in_progress' ? 'bg-brand-gold animate-pulse' :
                order.status === 'delivered' ? 'bg-brand-cyan' :
                order.status === 'completed' ? 'bg-green-500' : 'bg-brand-ember'
              }`} />
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                {order.status === 'in_progress' ? 'In Progress' :
                 order.status === 'delivered' ? 'Delivered — Review Required' :
                 order.status === 'completed' ? 'Completed' : 'Disputed'}
              </span>
            </div>

            {/* Seller: mark as delivered */}
            {isSeller && order.status === 'in_progress' && (
              showDeliverForm ? (
                <div className="space-y-2">
                  <textarea value={deliveryMsg} onChange={e => setDeliveryMsg(e.target.value)} rows={3}
                    placeholder="Describe what you delivered, include links if needed..."
                    className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-cyan resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleDeliver} disabled={delivering}
                      className="flex-1 py-2.5 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold disabled:opacity-50">
                      {delivering ? 'Submitting...' : 'Mark Delivered'}
                    </button>
                    <button onClick={() => setShowDeliverForm(false)} className="px-4 py-2.5 rounded-xl bg-surface-2 text-text-secondary text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowDeliverForm(true)} className="w-full py-3 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold">
                  Mark as Delivered
                </button>
              )
            )}

            {/* Buyer: approve or dispute */}
            {isBuyer && order.status === 'delivered' && (
              <div className="space-y-2">
                {order.deliveryMessage && (
                  <div className="p-3 rounded-xl bg-surface-2/50 border border-white/[0.04] mb-2">
                    <p className="text-[10px] text-text-muted uppercase font-bold mb-1">Seller's delivery note</p>
                    <p className="text-text-secondary text-sm">{order.deliveryMessage}</p>
                  </div>
                )}
                <button onClick={handleApprove} className="w-full py-3 rounded-xl bg-brand-cyan text-bg-dark text-sm font-bold">
                  Approve & Release Payment
                </button>
                {showDisputeForm ? (
                  <div className="space-y-2 pt-2">
                    <textarea value={disputeReason} onChange={e => setDisputeReason(e.target.value)} rows={2}
                      placeholder="Why are you disputing?"
                      className="w-full bg-surface-2 border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-text-primary outline-none resize-none" />
                    <div className="flex gap-2">
                      <button onClick={handleDispute} className="flex-1 py-2 rounded-xl bg-brand-ember/10 border border-brand-ember/30 text-brand-ember text-sm font-bold">File Dispute</button>
                      <button onClick={() => setShowDisputeForm(false)} className="px-4 py-2 rounded-xl bg-surface-2 text-text-secondary text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowDisputeForm(true)} className="w-full py-2.5 rounded-xl bg-surface-2 border border-white/[0.06] text-text-muted text-sm">
                    Something wrong? Dispute
                  </button>
                )}
              </div>
            )}

            {order.status === 'completed' && (
              <p className="text-green-500 text-sm text-center py-2">Order completed. Gems released to seller.</p>
            )}
            {order.status === 'disputed' && (
              <p className="text-brand-ember text-sm text-center py-2">Disputed. Coins refunded to buyer.</p>
            )}
          </div>
        ) : !isOwner ? (
          /* Purchase button */
          <div className="space-y-2">
            <button onClick={handlePurchase} disabled={purchasing || (wallet?.balance || 0) < service.priceCoins}
              className="w-full py-3.5 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              {purchasing ? 'Processing...' : (
                <>
                  <Icon name="shopping_cart" size={18} />
                  Buy for {service.priceCoins} coins
                </>
              )}
            </button>
            {(wallet?.balance || 0) < service.priceCoins && (
              <button onClick={() => navigate('/buy-coins')} className="w-full py-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-sm font-bold">
                Need {service.priceCoins - (wallet?.balance || 0)} more coins
              </button>
            )}
            <p className="text-text-muted text-[10px] text-center">Coins held in escrow until you approve delivery. Full refund if you dispute.</p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-surface-1 border border-white/[0.06] text-center">
            <p className="text-text-muted text-sm">This is your service listing</p>
            <button onClick={() => navigate('/services')} className="mt-2 text-brand-cyan text-sm font-bold">View all services</button>
          </div>
        )}
      </div>
    </div>
  );
}
