// src/components/SendCoinsModal.jsx
import { useState, useEffect } from 'react';
import Modal from './Modal';
import Icon from './Icon';
import { searchUsers, sendCoins, getWallet } from '../firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { useUI } from '../context/UIContext';

const SendCoinsModal = ({ isOpen, onClose, preselectedUser }) => {
  const { currentUser } = useAuth();
  const { wallet, refreshWallet } = useUser();
  const { showToast } = useUI();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(preselectedUser || null);
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedUser(preselectedUser || null);
      setAmount('');
      setSending(false);
    }
  }, [isOpen, preselectedUser]);

  // Search users when term changes (if no preselected user)
  useEffect(() => {
    if (selectedUser) return;
    const search = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await searchUsers(searchTerm, 5);
        setSearchResults(results.filter(u => u.id !== currentUser?.uid));
      } catch (err) {
        console.error(err);
      }
    };
    search();
  }, [searchTerm, selectedUser, currentUser]);

  const handleSend = async () => {
    if (!selectedUser || !amount || sending) return;
    const coins = parseInt(amount);
    if (isNaN(coins) || coins <= 0) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    if (coins > (wallet?.balance || 0)) {
      showToast('Insufficient balance', 'error');
      return;
    }

    setSending(true);
    try {
      await sendCoins(currentUser.uid, selectedUser.id, coins, `Sent ${coins} coins to @${selectedUser.username || selectedUser.displayName}`);
      showToast(`Sent ${coins} coins to @${selectedUser.username || selectedUser.displayName}`, 'coins');
      await refreshWallet();
      onClose();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send coins', 'error');
    }
    setSending(false);
  };

  // Helper to get display name
  const getDisplayName = (user) => {
    if (user.username) return `@${user.username}`;
    if (user.displayName) return user.displayName;
    return 'User';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Coins">
      {!selectedUser ? (
        <>
          <p className="text-text-secondary text-sm mb-3">Search for a user to send coins to</p>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username..."
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none"
            autoFocus
          />
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
            {searchResults.map(user => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="flex items-center gap-3 w-full p-3 rounded-xl bg-surface-2 border border-white/[0.06] hover:border-white/[0.12] transition-colors text-left"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{user.displayName || user.username}</p>
                  <p className="text-xs text-text-muted">{getDisplayName(user)}</p>
                </div>
              </button>
            ))}
            {searchTerm.length >= 2 && searchResults.length === 0 && (
              <p className="text-text-muted text-sm text-center py-4">No users found</p>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-2 border border-white/[0.06] mb-4">
            <img
              src={selectedUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedUser.username || selectedUser.id}`}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">{selectedUser.displayName || selectedUser.username || 'User'}</p>
              <p className="text-xs text-text-muted">{getDisplayName(selectedUser)}</p>
            </div>
            {!preselectedUser && (
              <button onClick={() => setSelectedUser(null)} className="text-text-muted">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>

          <label className="text-text-secondary text-xs font-bold uppercase mb-2 block">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="w-full bg-surface-2 border border-white/[0.06] rounded-xl py-3 px-4 text-2xl font-dmmono text-text-primary placeholder:text-text-muted focus:border-brand-cyan focus:outline-none text-center mb-2"
            autoFocus
          />
          <p className="text-text-muted text-xs text-center mb-4">
            Balance: <span className="text-brand-gold font-dmmono">{wallet?.balance || 0}</span> coins
          </p>

          <button
            onClick={handleSend}
            disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > (wallet?.balance || 0) || sending}
            className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
              amount && parseInt(amount) > 0 && parseInt(amount) <= (wallet?.balance || 0) && !sending
                ? 'bg-brand-cyan text-bg-dark'
                : 'bg-surface-3 text-text-muted'
            }`}
          >
            {sending ? 'Sending...' : `Send ${amount || 0} Coins`}
          </button>
        </>
      )}
    </Modal>
  );
};

export default SendCoinsModal;