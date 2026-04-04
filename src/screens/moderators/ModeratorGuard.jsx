import React from 'react';

export const ModeratorGuard = ({ user, isModMode, children }) => {
  // 1. Is the user actually a moderator?
  // 2. Are they currently in "Mod Mode"?
  if (user?.role !== 'moderator' || !isModMode) {
    return (
      <div className="p-4 text-center">
        <h1>Access Denied</h1>
        <p>You must be an active moderator to view this area.</p>
      </div>
    );
  }

  return children;
};