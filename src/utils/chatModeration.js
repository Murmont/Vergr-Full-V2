// src/utils/chatModeration.js
// Client-side chat input sanitization + rate limiting.
// Server-side AI moderation (Gemini Flash) is called separately via
// the `moderateMessage` callable — this file covers the synchronous
// rules that must enforce before the message leaves the device.

export const CHAT_DEFAULTS = {
  maxChars: 500,
  minChars: 1,
  maxLineBreaks: 3,
  maxRepeatRun: 15,      // e.g. "AHHHHHHHHHHHHHH..." — anything beyond this collapses
  capsMinLen: 20,        // only check caps ratio on messages longer than this
  capsThreshold: 0.7,    // >70% uppercase letters triggers warning
  maxEmojis: 50,
  duplicateWindowMs: 60_000,
  duplicateLimit: 3,
  globalWindowMs: 60_000,
  globalMsgLimit: 20,    // platform-wide cap across all channels
};

// Rough emoji counter — covers common emoji ranges + ZWJ sequences.
const EMOJI_RE = /(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*)/gu;

export function countEmojis(text) {
  const matches = text.match(EMOJI_RE);
  return matches ? matches.length : 0;
}

export function collapseLineBreaks(text, max = CHAT_DEFAULTS.maxLineBreaks) {
  const limit = new RegExp(`(\\r?\\n){${max + 1},}`, 'g');
  return text.replace(limit, '\n'.repeat(max));
}

export function collapseRepeatedChars(text, maxRun = CHAT_DEFAULTS.maxRepeatRun) {
  return text.replace(/(.)\1{15,}/gu, (m, ch) => ch.repeat(maxRun));
}

export function isMostlyCaps(text, opts = CHAT_DEFAULTS) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length < opts.capsMinLen) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length > opts.capsThreshold;
}

// Returns { ok, error, cleaned, warning } — caller decides how to surface.
export function sanitizeMessage(raw, opts = CHAT_DEFAULTS) {
  const warnings = [];
  let text = String(raw || '');

  if (!text.trim()) return { ok: false, error: 'Message cannot be empty.' };

  // Length cap
  if (text.length > opts.maxChars) {
    return { ok: false, error: `Messages are limited to ${opts.maxChars} characters.` };
  }

  // Collapse line breaks + char runs (don't block — just clean)
  text = collapseLineBreaks(text, opts.maxLineBreaks);
  text = collapseRepeatedChars(text, opts.maxRepeatRun);

  // Emoji cap — strip overflow
  const emojiCount = countEmojis(text);
  if (emojiCount > opts.maxEmojis) {
    let kept = 0;
    text = text.replace(EMOJI_RE, e => (++kept <= opts.maxEmojis ? e : ''));
    warnings.push(`Emoji limit is ${opts.maxEmojis} — extras removed.`);
  }

  if (isMostlyCaps(text, opts)) {
    warnings.push('Please avoid excessive caps.');
  }

  return { ok: true, cleaned: text, warning: warnings[0] || null };
}

// Strip http/https prefixes from non-privileged users' messages so links
// render as plain text. Broadcasters/mods bypass this.
export function stripLinksForViewer(text) {
  return text
    .replace(/https?:\/\//gi, '')
    .replace(/\bwww\./gi, '');
}

// ─── Rate limiting / duplicate detection (per-device) ───────────────────
const recentMessages = new Map(); // key: userId → { times: number[], textCounts: Map<text, {count, first}> }

function getBucket(uid) {
  if (!recentMessages.has(uid)) recentMessages.set(uid, { times: [], textCounts: new Map() });
  return recentMessages.get(uid);
}

export function canSendNow(uid, slowModeSec = 0) {
  const b = getBucket(uid);
  const now = Date.now();
  // Global flood limit
  b.times = b.times.filter(t => now - t < CHAT_DEFAULTS.globalWindowMs);
  if (b.times.length >= CHAT_DEFAULTS.globalMsgLimit) {
    return { ok: false, error: 'Slow down — too many messages.', cooldownSec: Math.ceil((CHAT_DEFAULTS.globalWindowMs - (now - b.times[0])) / 1000) };
  }
  // Slow mode
  if (slowModeSec > 0 && b.times.length) {
    const last = b.times[b.times.length - 1];
    const elapsed = (now - last) / 1000;
    if (elapsed < slowModeSec) {
      return { ok: false, error: `Slow mode — wait ${Math.ceil(slowModeSec - elapsed)}s.`, cooldownSec: Math.ceil(slowModeSec - elapsed) };
    }
  }
  return { ok: true };
}

export function isDuplicate(uid, text) {
  const b = getBucket(uid);
  const now = Date.now();
  // Clean expired entries
  for (const [k, v] of b.textCounts) {
    if (now - v.first > CHAT_DEFAULTS.duplicateWindowMs) b.textCounts.delete(k);
  }
  const key = text.trim().toLowerCase();
  const entry = b.textCounts.get(key);
  if (entry && entry.count >= CHAT_DEFAULTS.duplicateLimit) return true;
  return false;
}

export function recordSent(uid, text) {
  const b = getBucket(uid);
  const now = Date.now();
  b.times.push(now);
  const key = text.trim().toLowerCase();
  const entry = b.textCounts.get(key) || { count: 0, first: now };
  entry.count += 1;
  b.textCounts.set(key, entry);
}

// ─── Banned words (broadcaster-configurable) ───────────────────────────
// Supports simple wildcard: "bad*" → matches any word starting with "bad".
export function compileBannedPattern(list) {
  if (!list || !list.length) return null;
  const parts = list.map(w => {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '\\w*');
    return `\\b${escaped}\\b`;
  });
  return new RegExp(parts.join('|'), 'gi');
}

export function applyBannedWords(text, pattern, mode = 'asterisk') {
  if (!pattern) return { blocked: false, text };
  if (mode === 'block') {
    pattern.lastIndex = 0;
    return { blocked: pattern.test(text), text };
  }
  return { blocked: false, text: text.replace(pattern, m => '*'.repeat(m.length)) };
}
