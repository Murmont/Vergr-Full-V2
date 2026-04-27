// Active liveness challenge helpers.
//
// Uses MediaPipe FaceMesh's 468 landmarks. We compute:
//   - EAR (eye aspect ratio) for blink detection
//   - Head yaw via nose-x vs face-center-x for turn left / turn right
//
// Challenge sequence (randomised): blink → turn-left → turn-right
// Each step must be held briefly, then return to neutral.

// Landmark indices per MediaPipe FaceMesh.
const L_EYE = [33, 160, 158, 133, 153, 144];
const R_EYE = [362, 385, 387, 263, 373, 380];

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function ear(lm, eyeIdx) {
  const p = eyeIdx.map(i => lm[i]);
  // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
  return (dist(p[1], p[5]) + dist(p[2], p[4])) / (2 * dist(p[0], p[3]));
}

export function analyzeLandmarks(landmarks) {
  if (!landmarks) return null;
  const leftEAR = ear(landmarks, L_EYE);
  const rightEAR = ear(landmarks, R_EYE);
  const avgEAR = (leftEAR + rightEAR) / 2;

  // Head yaw: nose tip (1) relative to midpoint of ears (234, 454).
  const nose = landmarks[1];
  const lEar = landmarks[234];
  const rEar = landmarks[454];
  const earMidX = (lEar.x + rEar.x) / 2;
  const earSpan = Math.abs(rEar.x - lEar.x) || 0.001;
  const yaw = (nose.x - earMidX) / earSpan; // -ve = looking left, +ve = right

  return { avgEAR, yaw };
}

// Returns a controller object with a step() function called per frame.
// onEvent({type, message, progress}) where progress is 0..1 for the current challenge.
export function createLivenessController(onEvent) {
  const challenges = shuffle([
    { key: 'blink',       label: 'Blink once',         check: (m) => m.blinked },
    { key: 'turn_left',   label: 'Turn your head left',  check: (m) => m.yaw < -0.15 },
    { key: 'turn_right',  label: 'Turn your head right', check: (m) => m.yaw > 0.15 },
  ]);
  let idx = 0;
  let blinkState = 'open'; // 'open' | 'closed'
  let blinkCount = 0;
  let passedAt = 0;
  let done = false;

  onEvent?.({ type: 'challenge', message: challenges[0].label, challenge: challenges[0].key, index: 0, total: challenges.length });

  return {
    step(analysis) {
      if (done || !analysis) return;
      const { avgEAR, yaw } = analysis;

      // Maintain blink state machine
      if (avgEAR < 0.18 && blinkState === 'open') { blinkState = 'closed'; }
      else if (avgEAR > 0.24 && blinkState === 'closed') { blinkState = 'open'; blinkCount++; }

      const m = { avgEAR, yaw, blinked: blinkCount > 0 };
      const cur = challenges[idx];
      if (cur.check(m)) {
        if (!passedAt) passedAt = performance.now();
        // Require challenge condition to hold ~400ms so a flicker doesn't pass
        if (performance.now() - passedAt > 400) {
          onEvent?.({ type: 'pass', challenge: cur.key, index: idx });
          idx++;
          passedAt = 0;
          blinkCount = 0;
          if (idx >= challenges.length) {
            done = true;
            onEvent?.({ type: 'done' });
          } else {
            onEvent?.({ type: 'challenge', message: challenges[idx].label, challenge: challenges[idx].key, index: idx, total: challenges.length });
          }
        }
      } else {
        passedAt = 0;
      }
    },
    isDone: () => done,
    currentIndex: () => idx,
    totalChallenges: () => challenges.length,
  };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
