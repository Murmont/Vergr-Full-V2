// src/utils/mediaHelpers.js
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';
import { compressMedia } from './mediaCompression';

/** Default TTL: 7 days from now (in ms) */
const DEFAULT_TTL_DAYS = 7;

function getTtlMetadata(ttlDays = DEFAULT_TTL_DAYS) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + ttlDays);
  return {
    customMetadata: {
      ttlExpiry: expiry.toISOString(),
      uploadedAt: new Date().toISOString(),
    },
  };
}

/**
 * Starts audio recording. Returns a MediaRecorder instance.
 */
export const startVoiceRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder._chunks = chunks;
    recorder._stream = stream;
    recorder.start();
    return recorder;
  } catch (error) {
    console.error("Error accessing microphone:", error);
    throw error;
  }
};

/**
 * Stops recording and returns the audio blob.
 */
export const stopVoiceRecording = (recorder) => {
  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(recorder._chunks, { type: 'audio/webm' });
      recorder._stream?.getTracks().forEach(t => t.stop());
      resolve(blob);
    };
    recorder.stop();
  });
};

/**
 * Uploads a file to Firebase Storage with client-side compression and TTL metadata.
 * @param {File} file - The file to upload
 * @param {string} folder - Storage folder path
 * @param {string} tier - User tier: 'free' | 'lite' | 'pro'
 * @param {number} ttlDays - Days until server copy should expire
 * @returns {Promise<string>} Download URL
 */
export const uploadMediaFile = async (file, folder = 'chat_media', tier = 'free', ttlDays = DEFAULT_TTL_DAYS) => {
  // Compress before upload (free CPU on user's device)
  const compressed = await compressMedia(file, tier);

  const fileName = `${Date.now()}_${compressed.name || 'media_file'}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  const metadata = getTtlMetadata(ttlDays);

  const snapshot = await uploadBytes(storageRef, compressed, metadata);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Uploads a blob (like voice recording) to Firebase Storage with TTL metadata.
 */
export const uploadBlob = async (blob, folder = 'voice_notes', ext = 'webm', ttlDays = DEFAULT_TTL_DAYS) => {
  const fileName = `${Date.now()}_recording.${ext}`;
  const storageRef = ref(storage, `${folder}/${fileName}`);
  const metadata = getTtlMetadata(ttlDays);

  const snapshot = await uploadBytes(storageRef, blob, metadata);
  return await getDownloadURL(snapshot.ref);
};

/**
 * Helper to check if a string is a YouTube link and extract the ID.
 */
export const getYouTubeID = (url) => {
  if (!url || typeof url !== 'string') return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};