/* ==========================================================================
   js/audio/soundEngine.js - Bộ tạo âm thanh hiệu ứng bằng Web Audio API
   ========================================================================== */

let ac = null;
let lastBell = 0;
let lastZap = 0;

function getAudioContext() {
  if (!ac) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) ac = new AudioCtx();
  }
  if (ac && ac.state === 'suspended') {
    ac.resume();
  }
  return ac;
}

export function sfxClick(freq = 520) {
  try {
    const c = getAudioContext();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, c.currentTime + 0.045);
    g.gain.setValueAtTime(0.22, c.currentTime);
    g.gain.linearRampToValueAtTime(0.01, c.currentTime + 0.045);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.05);
  } catch (e) {
    // Phớt lờ nếu audio bị chặn bởi browser policy
  }
}

export function sfxZap() {
  if (Date.now() - lastZap < 600) return;
  lastZap = Date.now();
  try {
    const c = getAudioContext();
    if (!c) return;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.25), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.08));
    }
    const src = c.createBufferSource();
    const flt = c.createBiquadFilter();
    const g = c.createGain();
    src.buffer = buf;
    flt.type = 'bandpass';
    flt.frequency.value = 900;
    g.gain.value = 0.4;
    src.connect(flt).connect(g).connect(c.destination);
    src.start();
  } catch (e) {}
}

export function sfxBell() {
  if (Date.now() - lastBell < 160) return;
  lastBell = Date.now();
  try {
    const c = getAudioContext();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = 1350 + (Math.random() * 80);
    g.gain.setValueAtTime(0.16, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.005, c.currentTime + 0.12);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.13);
  } catch (e) {}
}

export function sfxWin() {
  try {
    const c = getAudioContext();
    if (!c) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      const t0 = c.currentTime + idx * 0.09;
      g.gain.setValueAtTime(0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.005, t0 + 0.25);
      o.connect(g).connect(c.destination);
      o.start(t0);
      o.stop(t0 + 0.26);
    });
  } catch (e) {}
}
