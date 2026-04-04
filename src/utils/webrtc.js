// WebRTC peer connection with Firestore signaling
// Audio/video flows peer-to-peer (free). Firestore is only used to exchange connection info.

import { doc, setDoc, updateDoc, onSnapshot, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

export function createPeerConnection() {
  return new RTCPeerConnection({ iceServers: ICE_SERVERS });
}

// Caller: create offer and write to Firestore
export async function createOffer(callId, pc, localStream) {
  // Add local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Collect ICE candidates and write to Firestore
  const candidatesRef = collection(db, 'calls', callId, 'callerCandidates');
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(candidatesRef, event.candidate.toJSON());
    }
  };

  // Create and set offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  await updateDoc(doc(db, 'calls', callId), {
    offer: { type: offer.type, sdp: offer.sdp },
  });

  // Listen for answer
  const unsub = onSnapshot(doc(db, 'calls', callId), (snap) => {
    const data = snap.data();
    if (data?.answer && !pc.currentRemoteDescription) {
      pc.setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  // Listen for callee's ICE candidates
  const calleeCandidatesRef = collection(db, 'calls', callId, 'calleeCandidates');
  const unsubCandidates = onSnapshot(calleeCandidatesRef, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  return () => { unsub(); unsubCandidates(); };
}

// Callee: read offer, create answer, write to Firestore
export async function answerCall(callId, pc, localStream) {
  // Add local tracks
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Get the call doc with offer
  const callSnap = await new Promise((resolve) => {
    const unsub = onSnapshot(doc(db, 'calls', callId), (snap) => {
      if (snap.data()?.offer) { unsub(); resolve(snap); }
    });
  });

  const offer = callSnap.data().offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offer));

  // Collect ICE candidates
  const candidatesRef = collection(db, 'calls', callId, 'calleeCandidates');
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(candidatesRef, event.candidate.toJSON());
    }
  };

  // Create and set answer
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(doc(db, 'calls', callId), {
    answer: { type: answer.type, sdp: answer.sdp },
    status: 'active',
  });

  // Listen for caller's ICE candidates
  const callerCandidatesRef = collection(db, 'calls', callId, 'callerCandidates');
  const unsubCandidates = onSnapshot(callerCandidatesRef, (snap) => {
    snap.docChanges().forEach(change => {
      if (change.type === 'added') {
        pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
      }
    });
  });

  return () => { unsubCandidates(); };
}

// Cleanup: end call, stop tracks, close connection
export async function endCallCleanup(callId, pc, localStream) {
  // Stop all tracks
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  // Close peer connection
  if (pc) {
    pc.close();
  }

  // Update status
  try {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended', endedAt: new Date() });
  } catch (err) {
    console.error('Error ending call:', err);
  }

  // Clean up ICE candidates (optional, saves Firestore storage)
  try {
    const callerCands = await getDocs(collection(db, 'calls', callId, 'callerCandidates'));
    const calleeCands = await getDocs(collection(db, 'calls', callId, 'calleeCandidates'));
    const deletePromises = [...callerCands.docs, ...calleeCands.docs].map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (err) { /* silent */ }
}

// Get user media stream
export async function getMediaStream(type = 'audio') {
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: type === 'video' ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    } : false,
  };

  return navigator.mediaDevices.getUserMedia(constraints);
}
