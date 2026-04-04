import React, { useEffect, useState } from 'react';
import { getTournaments } from '../../firebase/firestore';

export const ModeratorDashboard = () => {
  const [tournaments, setTournaments] = useState([]);

  useEffect(() => {
    // Fetch only active tournaments that need management
    getTournaments('active').then(setTournaments);
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Moderator Dashboard</h1>
      <div className="grid gap-4">
        {tournaments.map(t => (
          <div key={t.id} className="p-4 border rounded shadow">
            <h2 className="font-bold">{t.name}</h2>
            <button 
              onClick={() => window.location.href = `/mod/manage/${t.id}`}
              className="bg-purple-600 text-white px-4 py-2 rounded mt-2"
            >
              Manage Tournament
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};