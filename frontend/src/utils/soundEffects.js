/**
 * FinCore Nexus — Premium Micro-Audio Engine
 * Generates subtle, crystalline acoustic chimes for transaction saga stages
 * using native Web Audio API (Zero external MP3 dependencies).
 */

let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new AudioContextClass();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Plays a crystalline, subtle acoustic "ting" chime.
 * @param {number} step - Current step (1 to 8) to calculate ascending harmonic pitch
 * @param {number} volume - Subtle master volume (defaults to 0.09)
 */
export function playValidationTick(step = 1, volume = 0.09) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Musical scale frequencies (A5 pentatonic ascending: ~880Hz to ~1975Hz)
    const pitches = [
      880,   // Step 1: A5
      988,   // Step 2: B5
      1109,  // Step 3: C#6
      1245,  // Step 4: D#6
      1397,  // Step 5: F6
      1568,  // Step 6: G6
      1760,  // Step 7: A6
      1975,  // Step 8: B6
    ];

    const freq = pitches[Math.max(0, Math.min(step - 1, pitches.length - 1))] || 1200;
    const now = ctx.currentTime;

    // Master gain node with smooth envelope (no click/pop)
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(volume, now + 0.005); // 5ms attack
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28); // 280ms decay
    masterGain.connect(ctx.destination);

    // Primary crystalline sine tone
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now);
    osc.connect(masterGain);

    // Subtle metallic glass overtone (2.76x frequency at lower amplitude)
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.0001, now);
    overtoneGain.gain.exponentialRampToValueAtTime(volume * 0.22, now + 0.003);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    overtoneGain.connect(ctx.destination);

    const overtoneOsc = ctx.createOscillator();
    overtoneOsc.type = "sine";
    overtoneOsc.frequency.setValueAtTime(freq * 2.756, now);
    overtoneOsc.connect(overtoneGain);

    osc.start(now);
    overtoneOsc.start(now);
    osc.stop(now + 0.3);
    overtoneOsc.stop(now + 0.15);
  } catch {
    // Gracefully ignore audio failure in unsupported or mock environments
  }
}

/**
 * Plays a double "ting-ting" harmonic chord for final settlement completion.
 */
export function playSuccessChime(volume = 0.11) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Ting 1: High E6 (1318 Hz)
    playValidationTick(5, volume * 0.85);

    // Ting 2: Higher crystalline C7 + E7 after 95ms delay
    setTimeout(() => {
      try {
        const c = getAudioContext();
        if (!c) return;
        const now = c.currentTime;

        const masterGain = c.createGain();
        masterGain.gain.setValueAtTime(0.0001, now);
        masterGain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45); // longer reverb ring
        masterGain.connect(c.destination);

        const osc1 = c.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(2093, now); // C7

        const osc2 = c.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(2637, now); // E7
        osc2.connect(masterGain);
        osc1.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
      } catch {}
    }, 95);
  } catch {}
}

/**
 * Plays a soft, non-jarring low tone if a transfer fails.
 */
export function playFailureSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    gain.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
    osc.connect(gain);

    osc.start(now);
    osc.stop(now + 0.32);
  } catch {}
}
