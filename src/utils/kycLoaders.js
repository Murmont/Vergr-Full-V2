// Lazy CDN loaders for heavy KYC libraries.
//
// Each library is fetched from a CDN on demand. Models are hosted from our own
// Firebase Hosting under /models/* so we keep data residency. Callers receive
// progress updates via `onProgress({ step, percent, label })`.
//
// Libraries:
//   - Tesseract.js    — OCR
//   - face-api.js     — face descriptor + match
//   - MediaPipe FaceMesh — facial landmarks for liveness
//
// Nothing is bundled statically — first enter into /creator/verify triggers
// downloads (~15–20 MB total, cached afterward).

const CDN = {
  tesseract: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  faceapi:   'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/dist/face-api.js',
  mediapipe: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js',
};

const loaded = {};

function loadScript(src) {
  if (loaded[src]) return loaded[src];
  loaded[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  return loaded[src];
}

// ---------- Tesseract ----------
export async function loadTesseract(onProgress) {
  onProgress?.({ step: 'ocr', percent: 5, label: 'Loading OCR…' });
  await loadScript(CDN.tesseract);
  onProgress?.({ step: 'ocr', percent: 100, label: 'OCR ready' });
  return window.Tesseract;
}

// ---------- face-api.js ----------
// Models hosted locally from public/models (served by Firebase Hosting).
export async function loadFaceApi(onProgress) {
  onProgress?.({ step: 'face', percent: 5, label: 'Loading face match…' });
  await loadScript(CDN.faceapi);
  const faceapi = window.faceapi;
  const MODEL_URL = '/models';
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  onProgress?.({ step: 'face', percent: 100, label: 'Face match ready' });
  return faceapi;
}

// ---------- MediaPipe FaceMesh ----------
export async function loadFaceMesh(onProgress) {
  onProgress?.({ step: 'live', percent: 5, label: 'Loading liveness…' });
  await loadScript(CDN.mediapipe);
  const faceMesh = new window.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
  });
  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  onProgress?.({ step: 'live', percent: 100, label: 'Liveness ready' });
  return faceMesh;
}

// ---------- OCR helper ----------
export async function runOcr(Tesseract, imageEl, onProgress) {
  const { data } = await Tesseract.recognize(imageEl, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress?.({ step: 'ocr', percent: Math.round(m.progress * 100), label: 'Reading document…' });
      }
    },
  });
  return { text: data.text || '', confidence: data.confidence || 0 };
}

// Very lenient name / DOB match — we flag mismatches, we don't block.
export function crossCheckOcr(ocrText, { firstName, lastName, dob }) {
  const t = (ocrText || '').toUpperCase().replace(/[^A-Z0-9\s/.-]/g, ' ');
  const nameHit = !!firstName && !!lastName
    && t.includes(firstName.toUpperCase())
    && t.includes(lastName.toUpperCase());
  // DOB in any common format (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  let dobHit = false;
  if (dob) {
    const [y, m, d] = dob.split('-');
    const variants = [
      `${d}/${m}/${y}`, `${d}-${m}-${y}`, `${d}.${m}.${y}`, `${y}-${m}-${d}`,
      `${d} ${m} ${y}`, `${m}/${d}/${y}`,
    ];
    dobHit = variants.some(v => t.includes(v.toUpperCase()));
  }
  return { nameHit, dobHit, flagged: !(nameHit && dobHit) };
}
