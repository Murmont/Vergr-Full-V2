import React from 'react';

export const ModeratorModeToggle = ({ isModMode, onToggle }) => {
  // Only show if the user has the 'moderator' role (which we will set in Firestore later)
  return (
    <div className="flex items-center justify-between p-4 border-t">
      <div>
        <h3 className="font-bold">Moderator Mode</h3>
        <p className="text-sm text-gray-500">Switch between player and mod views</p>
      </div>
      <button 
        onClick={onToggle}
        className={`px-4 py-2 rounded ${isModMode ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
      >
        {isModMode ? 'Switch to Player' : 'Switch to Mod'}
      </button>
    </div>
  );
};