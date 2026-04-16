/**
 * Google Thanos-Snap dissolve — exact algorithm from the VERGR brief.
 *
 * html2canvas is dynamically imported so the 400KB cost is only paid the
 * first time a user deletes a message (not on initial app load).
 */

const CANVAS_COUNT = 40;

/**
 * Weighted random distribution — same formula as the Google Thanos snap.
 * Returns a canvas index biased toward `peak`, creating the "crumble from
 * one side" effect rather than uniform scattering.
 */
function weightedRandomDistrib(peak) {
  const prob = [];
  const seq = [];
  for (let i = 0; i < CANVAS_COUNT; i++) {
    prob.push(Math.pow(CANVAS_COUNT - Math.abs(peak - i), 3));
    seq.push(i);
  }
  const total = prob.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < seq.length; i++) {
    r -= prob[i];
    if (r <= 0) return seq[i];
  }
  return seq[seq.length - 1];
}

function createBlankImageDatas(sourceImageData) {
  const result = [];
  for (let i = 0; i < CANVAS_COUNT; i++) {
    result.push(new Uint8ClampedArray(sourceImageData.data.length));
  }
  return result;
}

function newCanvasFromImageData(pixelArray, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(new ImageData(pixelArray, w, h), 0, 0);
  return canvas;
}

function animateDustCanvas(canvas, index) {
  const tx = 60 + Math.random() * 80;               // always drift right
  const ty = -50 + Math.random() * 100;             // random vertical
  const rot = -25 + Math.random() * 50;             // slight rotation
  const delay = index * 10;                          // stagger: 10ms per layer
  const duration = 500 + index * 18;                 // max ~1.2s for final layer

  canvas.style.cssText += `
    transition: transform ${duration}ms cubic-bezier(0.4, 0, 1, 1) ${delay}ms,
                opacity   ${duration}ms ease-in                      ${delay}ms;
    will-change: transform, opacity;
  `;

  // Force reflow so the transition registers before we change the values
  canvas.getBoundingClientRect();

  canvas.style.transform = `rotate(${rot}deg) translate(${tx}px, ${ty}px)`;
  canvas.style.opacity = '0';

  return new Promise(resolve => {
    setTimeout(() => {
      canvas.remove();
      resolve();
    }, delay + duration + 50);
  });
}

// Cache the html2canvas module so we only load it once
let html2canvasPromise = null;
function loadHtml2canvas() {
  if (!html2canvasPromise) {
    html2canvasPromise = import('html2canvas').then(m => m.default || m);
  }
  return html2canvasPromise;
}

/**
 * Kick off the html2canvas dynamic import ahead of time so the first
 * delete doesn't eat the 400KB load cost. Safe to call multiple times.
 * Call from any screen that might trigger a dissolve.
 */
export function preloadThanosDissolve() {
  loadHtml2canvas().catch(() => { /* will retry on actual use */ });
}

/**
 * Dissolve a DOM element using the Google Thanos-snap algorithm.
 *
 * Resolves AS SOON AS the 40 dust canvases are in the DOM and hiding the
 * original element — at that point the caller can safely unmount the
 * element (via state update). The returned promise's `.finished` property
 * settles once the dust animation completes, if you need it.
 *
 * @param {HTMLElement} el
 * @returns {Promise<void>} resolves when the snapshot is live on screen.
 */
export async function dissolveElement(el) {
  if (!el || !el.getBoundingClientRect) return;

  const html2canvas = await loadHtml2canvas();
  const rect = el.getBoundingClientRect();

  // 1. Snapshot the element
  let snapshot;
  try {
    snapshot = await html2canvas(el, {
      scale: window.devicePixelRatio || 1,
      useCORS: true,
      backgroundColor: null,
      logging: false,
    });
  } catch (err) {
    console.warn('Thanos dissolve snapshot failed:', err);
    return;
  }

  const w = snapshot.width;
  const h = snapshot.height;

  // 2. Hide original element immediately
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';

  // 3. Get raw pixel data
  const ctx = snapshot.getContext('2d');
  const imageData = ctx.getImageData(0, 0, w, h);
  const rawPixels = imageData.data;

  // 4. Distribute pixels across CANVAS_COUNT buckets (Thanos algorithm)
  const pixelBuckets = createBlankImageDatas(imageData);
  for (let i = 0; i < rawPixels.length; i += 4) {
    const peak = Math.floor((i / rawPixels.length) * CANVAS_COUNT);
    const targetBucket = weightedRandomDistrib(peak);
    const bucket = pixelBuckets[targetBucket];
    bucket[i]     = rawPixels[i];
    bucket[i + 1] = rawPixels[i + 1];
    bucket[i + 2] = rawPixels[i + 2];
    bucket[i + 3] = rawPixels[i + 3];
  }

  // 5. Create a viewport-clamped stage so the canvases can't extend the
  //    document's scroll area. Without this, mobile WebKit treats the
  //    transforms on the `position: fixed` canvases as contributing to
  //    document layout for ~1-2 seconds and scroll-anchors the whole page,
  //    which was pushing the chat header off-screen post-delete.
  const stage = document.createElement('div');
  stage.style.cssText = `
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 9999;
    contain: strict;
  `;
  document.body.appendChild(stage);

  const dustCanvases = [];
  for (let i = 0; i < CANVAS_COUNT; i++) {
    const dustCanvas = newCanvasFromImageData(pixelBuckets[i], w, h);
    dustCanvas.style.cssText = `
      position: absolute;
      left: ${rect.left}px;
      top: ${rect.top}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      opacity: 1;
      transform: none;
    `;
    stage.appendChild(dustCanvas);
    dustCanvases.push(dustCanvas);
  }

  // 6. Kick off the drift+fade animation in the background. We DO NOT await
  //    it — the caller wants to unmount the source element the moment the
  //    canvases are live, so the layout can collapse. The stage cleans
  //    itself up once every canvas has finished.
  const animations = dustCanvases.map((canvas, i) => animateDustCanvas(canvas, i));
  Promise.all(animations).then(() => stage.remove()).catch(() => stage.remove());
}
