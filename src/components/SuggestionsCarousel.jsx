import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebase/config';
import UserAvatar from './UserAvatar';

export default function SuggestionsCarousel() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // First try verified users
        let q = query(collection(db, 'users'), where('isVerified', '==', true), limit(10));
        let snap = await getDocs(q);
        if (snap.empty) {
          // If no verified users, get any users (excluding current? optional)
          q = query(collection(db, 'users'), limit(10));
          snap = await getDocs(q);
        }
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    };
    fetchUsers();
  }, []);

  if (users.length === 0) return null;

  return (
    <div className="py-4 border-b border-white/[0.04]">
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="text-sm font-syne font-bold text-text-primary">Who to Follow</h3>
        <button onClick={() => navigate('/browse-creators')} className="text-brand-cyan text-xs">Show all</button>
      </div>
      <div className="flex overflow-x-auto no-scrollbar gap-3 px-4">
        {users.map(user => (
          <button key={user.id} onClick={() => navigate(`/user/${user.id}`)} className="flex flex-col items-center shrink-0 gap-1">
            <UserAvatar src={user.avatar} size={56} isVerified={user.isVerified} />
            <p className="text-text-primary text-xs font-semibold truncate w-16 text-center">{user.displayName}</p>
            <button className="px-3 py-0.5 rounded-full bg-brand-cyan/10 text-brand-cyan text-[9px] font-bold">Follow</button>
          </button>
        ))}
      </div>
    </div>
  );
}