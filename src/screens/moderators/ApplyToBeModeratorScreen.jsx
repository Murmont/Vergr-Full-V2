import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const ApplyToBeModeratorScreen = ({ user }) => {
  const [experience, setExperience] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submitApplication = async () => {
    setSubmitting(true);
    await addDoc(collection(db, 'moderator_applications'), {
      userId: user.id,
      username: user.username,
      experience,
      status: 'pending',
      appliedAt: serverTimestamp(),
    });
    setSubmitting(false);
    alert('Application submitted! We will review it shortly.');
  };

  return (
    <div className="p-4">
      <h1>Become a Moderator</h1>
      <textarea 
        placeholder="Describe your moderation experience..."
        value={experience}
        onChange={(e) => setExperience(e.target.value)}
        className="w-full h-32 p-2 border"
      />
      <button 
        disabled={submitting} 
        onClick={submitApplication}
        className="mt-4 bg-blue-500 text-white p-2 rounded"
      >
        Submit Application
      </button>
    </div>
  );
};