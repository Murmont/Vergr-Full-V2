import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Icon from '../../components/Icon';
import useResponsive from '../../hooks/useResponsive';
import { useLayout } from '../../context/LayoutContext';
import RightSidebarPanel from '../../components/RightSidebarPanel';
import TopBar from '../../components/TopBar';

export default function TransactionReceiptScreen() {
  const navigate = useNavigate();
  const { txId } = useParams();
  const [transaction, setTransaction] = useState(null);
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
    if (!txId) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'transactions', txId));
      if (snap.exists()) setTransaction({ id: snap.id, ...snap.data() });
    };
    load();
  }, [txId]);

  // Fallback mock data for demo
  const tx = transaction || {
    id: txId || 'TXN-2026-0302-001',
    type: 'Purchase',
    item: '500 Coin Pack',
    amount: '€4.49',
    coins: '+550',
    method: 'Visa •••• 4242',
    date: new Date().toLocaleString(),
    status: 'Completed'
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts instanceof Date) return ts.toLocaleString();
    return String(ts);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {isMobile && <TopBar title="Receipt" showBack />}
      {!isMobile && (
        <div className="flex justify-end px-4 pt-4">
          <button onClick={() => navigate(-1)} className="text-white/80 hover:text-white transition-colors" aria-label="Go back">
            <Icon name="arrow_back" size={24} />
          </button>
        </div>
      )}
      <header className="flex items-center gap-3 px-5 pt-4 pb-4">
        <h1 className="text-white font-syne font-bold text-lg">Receipt</h1>
      </header>
      <main className="flex-1 px-5 pb-8">
        <div className="bg-surface-1 rounded-2xl p-6 border border-white/[0.06]">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Icon name="check_circle" filled size={32} className="text-green-500" />
            </div>
          </div>
          <h2 className="text-white text-xl font-bold text-center mb-1">{tx.amount}</h2>
          <p className="text-green-500 font-bold text-center mb-6">{tx.coins} coins</p>
          <div className="border-t border-white/[0.04] pt-4 flex flex-col gap-3">
            {Object.entries({
              ID: tx.id,
              Type: tx.type,
              Item: tx.item,
              Payment: tx.method,
              Date: formatDate(tx.date),
              Status: tx.status
            }).map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-text-muted text-sm">{l}</span>
                <span className="text-text-primary text-sm font-semibold">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}