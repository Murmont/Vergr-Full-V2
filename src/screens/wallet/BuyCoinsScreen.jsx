import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { useUI } from '../../context/UIContext';
import { getCoinPackages } from '../../firebase/firestore';
import TopBar from '../../components/TopBar';
import CoinDisplay from '../../components/CoinDisplay';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';

export default function BuyCoinsScreen() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);

  const { wallet } = useUser();
  const { showToast } = useUI();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { setRightPanel, setContentAlign } = useLayout();

  useEffect(() => {
    setRightPanel(<RightSidebarPanel />);
    setContentAlign('left');
    return () => {
      setRightPanel(null);
      setContentAlign('center');
    };
  }, [setRightPanel, setContentAlign]);

  useEffect(() => {
    getCoinPackages()
      .then(setPacks)
      .catch(err => {
        console.error('Failed to load coin packs:', err);
        showToast('Failed to load coin packs', 'error');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleBuy = (pack) => {
    setSelectedPack(pack);
    setShowPaymentModal(true);
  };

  const handleCustomBuy = () => {
    const amount = parseInt(customAmount);
    if (isNaN(amount) || amount < 100) {
      showToast('Minimum custom amount is 100 coins', 'error');
      return;
    }
    setSelectedPack({
      id: 'custom',
      name: `${amount} Coins`,
      coins: amount,
      bonus: 0,
      priceEUR: (amount * 0.01).toFixed(2),
      icon: '🪙'
    });
    setShowCustomModal(false);
    setShowPaymentModal(true);
  };

  return (
    <div className="pb-8">
      {isMobile && <TopBar title="Buy Coins" showBack actions={<CoinDisplay amount={wallet?.balance || 0} size="sm" />} />}
      {!isMobile && (
        <div className="flex justify-start px-4 pt-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors" aria-label="Go back">
            <Icon name="arrow_back" size={24} />
          </button>
        </div>
      )}

      <div className="px-4 py-4">
        <p className="text-text-secondary text-sm mb-6">Purchase coins to tip creators, enter tournaments, and support your squad.</p>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-surface-3 border-t-brand-cyan rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="mb-8 p-5 rounded-2xl bg-surface-1 border border-white/[0.06]">
              <label className="block text-text-secondary text-xs font-bold uppercase mb-2">Custom Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter amount (min 100)"
                  className="flex-1 bg-surface-2 border border-white/[0.06] rounded-xl px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none"
                />
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="px-6 py-3 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm hover:brightness-110 active:scale-95 transition-all" 
                >
                  Buy
                </button>
              </div>
              <p className="text-text-muted text-xs mt-2">≈ €{((parseInt(customAmount) || 0) * 0.01).toFixed(2)}</p>
            </div>

            <h3 className="font-syne font-bold text-lg mb-3">Coin Packs</h3>
            <div className="space-y-3">
              {packs.length === 0 ? (
                <div className="text-center py-12">
                  <Icon name="monetization_on" size={48} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted text-sm">Coin packs coming soon</p>
                </div>
              ) : (
                packs.map((pack, i) => {
                  const isBestValue = i === packs.length - 2;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => handleBuy(pack)}
                      className={`w-full p-5 rounded-2xl border relative text-left transition-all active:scale-[0.98] ${
                        isBestValue ? 'border-brand-cyan bg-brand-cyan/5' : 'border-white/[0.06] bg-surface-1 hover:border-white/[0.12]'
                      }`}
                    >
                      {isBestValue && (
                        <span className="absolute -top-3 left-6 bg-brand-cyan text-bg-dark text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                          Best Value
                        </span>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">{pack.icon || '🪙'}</span>
                            <h3 className="font-bold text-base">{pack.name}</h3>
                          </div>
                          <p className="font-dmmono text-brand-gold text-sm">{pack.coins?.toLocaleString()} Coins</p>
                          {pack.bonus > 0 && (
                            <p className="text-green-500 text-xs mt-0.5">+{pack.bonus} bonus coins</p>
                          )}
                        </div>
                        <div className="px-6 py-2.5 rounded-full bg-brand-cyan text-bg-dark font-bold text-sm" >
                          €{pack.priceEUR}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-text-muted/50">
          <div className="flex items-center gap-1 text-xs">
            <Icon name="lock" size={14} />
            <span>Secure</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Icon name="bolt" size={14} />
            <span>Instant delivery</span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <Icon name="shield" size={14} />
            <span>Protected</span>
          </div>
        </div>
      </div>

      <Modal isOpen={showCustomModal} onClose={() => setShowCustomModal(false)} title="Confirm Custom Purchase">
        {customAmount && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-2 border border-white/[0.06] text-center">
              <p className="text-2xl mb-2">🪙</p>
              <h3 className="font-bold text-lg">{parseInt(customAmount).toLocaleString()} Coins</h3>
              <p className="text-2xl font-bold mt-2">€{((parseInt(customAmount) || 0) * 0.01).toFixed(2)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="flex-1 py-3 rounded-xl bg-surface-2 text-text-secondary font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomBuy}
                className="flex-1 py-3 rounded-xl bg-brand-cyan text-bg-dark font-bold text-sm"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Complete Purchase">
        {selectedPack && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-2 border border-white/[0.06] text-center">
              <p className="text-lg mb-1">{selectedPack.icon || '🪙'}</p>
              <h3 className="font-bold text-lg">{selectedPack.name}</h3>
              <p className="font-dmmono text-brand-gold">{selectedPack.coins?.toLocaleString()} coins{selectedPack.bonus > 0 ? ` + ${selectedPack.bonus} bonus` : ''}</p>
              <p className="text-2xl font-bold mt-2">€{selectedPack.priceEUR}</p>
            </div>

            <div className="p-4 rounded-2xl bg-brand-cyan/5 border border-brand-cyan/20">
              <div className="flex items-start gap-2">
                <Icon name="info" size={16} className="text-brand-cyan mt-0.5 shrink-0" />
                <p className="text-text-secondary text-xs leading-relaxed">
                  Payment processing is being finalised. You'll be able to purchase coins with credit/debit card, PayPal, and other methods soon.
                </p>
              </div>
            </div>

            <button
              onClick={() => { setShowPaymentModal(false); showToast('Payment coming soon!', 'info'); }}
              className="w-full py-3.5 rounded-xl bg-surface-3 text-text-muted font-bold text-sm">
              Coming Soon
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}