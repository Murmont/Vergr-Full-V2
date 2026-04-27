// KYC client-side encryption.
//
// Design:
//  - Generate a fresh AES-GCM 256 "data key" (DK) per application.
//  - Encrypt each blob (ID front, ID back, selfie) and the PII JSON with the
//    SAME DK but a UNIQUE random IV per encryption.
//  - Wrap the DK with the server's RSA-OAEP public key.
//  - Upload the ciphertext blobs to Storage; write {wrappedKey, ivs, …} to
//    Firestore.
//
// Only the Cloud Function (which holds the RSA private key in Secret Manager)
// can unwrap the DK and decrypt. The raw PII never touches Firestore in plain
// text.
//
// Uses the browser's built-in Web Crypto API — no dependencies.

import { KYC_PUBLIC_KEY_PEM, KYC_WRAP_ALG } from '../constants/kycPublicKey';

const subtle = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Secure context required (HTTPS). Web Crypto is unavailable.');
  }
  return globalThis.crypto.subtle;
};

// ---------- Base64 helpers ----------
export const bufToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};
export const b64ToBuf = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

// ---------- PEM → CryptoKey (RSA public) ----------
async function importRsaPublic() {
  const pem = KYC_PUBLIC_KEY_PEM
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s+/g, '');
  const spki = b64ToBuf(pem);
  return subtle().importKey('spki', spki, KYC_WRAP_ALG, false, ['wrapKey', 'encrypt']);
}

// ---------- Data-key lifecycle ----------
export async function generateDataKey() {
  return subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function wrapDataKey(dataKey) {
  const rsa = await importRsaPublic();
  // Export raw AES key bytes then encrypt with RSA-OAEP.
  const raw = await subtle().exportKey('raw', dataKey);
  const wrapped = await subtle().encrypt(KYC_WRAP_ALG, rsa, raw);
  return bufToB64(wrapped);
}

// ---------- Encrypt blobs / JSON ----------
function randomIv() {
  const iv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(iv);
  return iv;
}

export async function encryptBlob(dataKey, blobOrFile) {
  const plaintext = await blobOrFile.arrayBuffer();
  const iv = randomIv();
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv }, dataKey, plaintext);
  return {
    blob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    ivB64: bufToB64(iv),
    size: plaintext.byteLength,
  };
}

export async function encryptJson(dataKey, obj) {
  const pt = new TextEncoder().encode(JSON.stringify(obj));
  const iv = randomIv();
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, dataKey, pt);
  return { ciphertextB64: bufToB64(ct), ivB64: bufToB64(iv) };
}

// ---------- SHA-256 (for document hash / audit) ----------
export async function sha256Hex(blobOrBuf) {
  const buf = blobOrBuf instanceof Blob ? await blobOrBuf.arrayBuffer() : blobOrBuf;
  const digest = await subtle().digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
