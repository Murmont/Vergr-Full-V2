import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import SquadsList from './SquadsList';

export default function SquadsListPanel() {
  const [squads, setSquads] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'squads'), where('memberIds', 'array-contains', auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSquads(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSelect = (squadId) => {
    navigate(`/squads/${squadId}/chat`); // changed to chat screen
  };

  return (
    <div className="h-full overflow-y-auto no-scrollbar">
      <div className="p-4">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Your Squads</h2>
        <SquadsList
          squads={squads}
          loading={loading}
          emptyMessage="You haven't joined any squads yet."
          onSquadClick={handleSelect}
        />
      </div>
    </div>
  );
}