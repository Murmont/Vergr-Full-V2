/**
 * Offline send queue.
 *
 * When the relayMessage callable fails because the device is offline (or
 * otherwise unreachable), the message payload is written to Dexie's outbox.
 * On reconnect, the queue processor retries with exponential backoff.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/config';
import {
  addToOutbox, getOutboxMessages, removeFromOutbox, updateOutboxStatus,
} from './messageCache';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s, 8s, 16s — then give up

let processing = false;
let listenersAttached = false;

const listeners = new Set();

export function onQueueChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const fn of listeners) try { fn(); } catch {} }

export function isOfflineError(err) {
  if (!navigator.onLine) return true;
  const msg = (err?.message || '').toLowerCase();
  const code = err?.code || '';
  return msg.includes('network') || msg.includes('fetch') || msg.includes('offline') ||
         code === 'unavailable' || code === 'functions/unavailable' ||
         code === 'functions/internal' || code === 'functions/deadline-exceeded';
}

/** Enqueue a message for later retry. Returns the localId. */
export async function enqueueMessage(chatId, payload) {
  const localId = await addToOutbox(chatId, payload);
  notify();
  return localId;
}

async function attemptSend(localId, chatId, payload) {
  const relay = httpsCallable(functions, 'relayMessage');
  const result = await relay({ chatId, ...payload });
  return result?.data;
}

/** Process all pending outbox messages. Idempotent; safe to call multiple times. */
export async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    const pending = await getOutboxMessages('pending');
    const now = Date.now();
    for (const item of pending) {
      if (item.nextAttemptAt && item.nextAttemptAt > now) continue;
      try {
        await attemptSend(item.localId, item.chatId, item.payload);
        await removeFromOutbox(item.localId);
        notify();
      } catch (err) {
        const retryCount = (item.retryCount || 0) + 1;
        if (retryCount >= MAX_RETRIES || !isOfflineError(err)) {
          await updateOutboxStatus(item.localId, {
            status: 'failed',
            retryCount,
            lastError: String(err?.message || err).substring(0, 300),
          });
        } else {
          const delay = BASE_DELAY_MS * Math.pow(2, retryCount - 1);
          await updateOutboxStatus(item.localId, {
            retryCount,
            nextAttemptAt: Date.now() + delay,
            lastError: String(err?.message || err).substring(0, 300),
          });
        }
        notify();
      }
    }
  } finally {
    processing = false;
  }
}

/** Retry a specific failed message (wired to the UI retry button). */
export async function retryOutboxItem(localId) {
  await updateOutboxStatus(localId, {
    status: 'pending', retryCount: 0, nextAttemptAt: Date.now(),
  });
  notify();
  await processQueue();
}

/** Attach global listeners once on app start. */
export function startOfflineQueue() {
  if (listenersAttached) return;
  listenersAttached = true;

  window.addEventListener('online', () => { processQueue(); });
  // Periodic tick so scheduled retries fire
  setInterval(() => {
    if (navigator.onLine) processQueue();
  }, 15000);
  // Kick off once at startup
  processQueue();
}
