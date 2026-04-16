import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { getUser } from '../firebase/firestore';
import Icon from './Icon';
import UserAvatar from './UserAvatar';

export default function IncomingCallOverlay() {
  const [incomingCall, setIncomingCall] = useState(null);
  const [caller, setCaller] = useState(null);
  const [declining, setDeclining] = useState(false);
  const navigate = useNavigate();

  // Listen for incoming calls
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // CRITICAL: must filter by participant. The previous query read EVERY
    // ringing call worldwide which billed reads for unrelated users' calls.
    const q = query(
      collection(db, 'calls'),
      where('participants', 'array-contains', uid),
      where('status', '==', 'ringing')
    );

    const unsub = onSnapshot(q, async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added') {
          const call = { id: change.doc.id, ...change.doc.data() };
          // Only ring if we're a participant and not the caller
          if (call.callerId === uid) continue;
          if (!call.participants?.includes(uid)) continue;
          // Check timeout (30s)
          const created = call.createdAt?.toDate ? call.createdAt.toDate() : new Date(call.createdAt);
          if (Date.now() - created.getTime() > 30000) continue;

          setIncomingCall(call);
          const callerData = await getUser(call.callerId).catch(() => null);
          setCaller(callerData);
        }
      }
    });

    return () => unsub();
  }, []);

  // Auto-timeout after 30s
  useEffect(() => {
    if (!incomingCall) return;
    const timer = setTimeout(() => {
      handleDecline();
    }, 30000);
    return () => clearTimeout(timer);
  }, [incomingCall]);

  // Listen for caller hangup
  useEffect(() => {
    if (!incomingCall) return;
    const unsub = onSnapshot(doc(db, 'calls', incomingCall.id), (snap) => {
      if (!snap.exists() || snap.data()?.status === 'ended') {
        setIncomingCall(null);
        setCaller(null);
      }
    });
    return () => unsub();
  }, [incomingCall]);

  const handleAccept = () => {
    if (!incomingCall) return;
    navigate(`/call/${incomingCall.id}/${incomingCall.type || 'audio'}?role=callee`);
    setIncomingCall(null);
    setCaller(null);
  };

  const handleDecline = async () => {
    if (!incomingCall || declining) return;
    setDeclining(true);
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), { status: 'ended', declinedBy: auth.currentUser?.uid });
    } catch (err) { console.error(err); }
    setIncomingCall(null);
    setCaller(null);
    setDeclining(false);
  };

  if (!incomingCall) return null;

  const isVideo = incomingCall.type === 'video';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      {/* Call card */}
      <div className="relative z-10 flex flex-col items-center px-8 py-12 max-w-sm w-full mx-4">
        {/* Animated rings */}
        <div className="relative mb-8">
          <div className="absolute inset-0 w-32 h-32 -m-4 rounded-full border-2 border-brand-cyan/20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-0 w-28 h-28 -m-2 rounded-full border border-brand-cyan/30 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
          <div className="absolute inset-0 w-36 h-36 -m-6 rounded-full border border-brand-cyan/10 animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          <UserAvatar src={caller?.avatar || incomingCall.callerAvatar} size={96} />
        </div>

        {/* Caller info */}
        <h2 className="font-syne text-2xl font-bold text-text-primary mb-1">
          {caller?.displayName || incomingCall.callerName || 'Unknown'}
        </h2>
        <p className="text-brand-cyan text-sm font-dmmono mb-1">
          @{caller?.username || 'user'}
        </p>
        <div className="flex items-center gap-2 mb-10">
          <Icon name={isVideo ? 'videocam' : 'call'} size={16} className="text-text-muted" />
          <p className="text-text-muted text-sm animate-pulse">
            Incoming {isVideo ? 'video' : 'audio'} call...
          </p>
        </div>

        {/* Accept / Decline buttons */}
        <div className="flex items-center gap-10">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleDecline} disabled={declining}
              className="w-16 h-16 rounded-full bg-brand-ember flex items-center justify-center  hover:scale-105 active:scale-95 transition-all">
              <Icon name="call_end" size={28} className="text-white" />
            </button>
            <span className="text-text-muted text-xs font-semibold">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center  hover:scale-105 active:scale-95 transition-all">
              <Icon name={isVideo ? 'videocam' : 'call'} size={28} className="text-white" />
            </button>
            <span className="text-text-muted text-xs font-semibold">Accept</span>
          </div>
        </div>

        {/* VERGR branding */}
        <p className="text-text-muted/30 text-[9px] font-dmmono uppercase tracking-[0.3em] mt-12">
          VERGR · Encrypted P2P Call
        </p>
      </div>
    </div>
  );
}
