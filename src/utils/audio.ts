let audioCtx: AudioContext | null = null;
let ambientOsc: OscillatorNode | null = null;
let ambientGain: GainNode | null = null;
export let isMuted = true;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const toggleMute = () => {
  isMuted = !isMuted;
  if (!isMuted) {
    initAudio();
    startAmbient();
  } else {
    stopAmbient();
  }
  return isMuted;
};

export const playHover = () => {
  if (isMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // High-tech short tick
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.03);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, audioCtx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.03);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.03);
  } catch (e) {
    console.error(e);
  }
};

export const playClick = () => {
  if (isMuted || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    // Deep electronic thud
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    console.error(e);
  }
};

const startAmbient = () => {
  if (!audioCtx || ambientOsc) return;
  try {
    ambientOsc = audioCtx.createOscillator();
    ambientGain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    ambientOsc.type = 'sine';
    ambientOsc.frequency.value = 55; // Low drone
    
    filter.type = 'lowpass';
    filter.frequency.value = 150;

    ambientGain.gain.value = 0.02; // Very quiet

    ambientOsc.connect(filter);
    filter.connect(ambientGain);
    ambientGain.connect(audioCtx.destination);
    ambientOsc.start();
  } catch (e) {
    console.error(e);
  }
};

const stopAmbient = () => {
  if (ambientOsc) {
    try {
      ambientOsc.stop();
      ambientOsc.disconnect();
    } catch (e) {}
    ambientOsc = null;
  }
  if (ambientGain) {
    try {
      ambientGain.disconnect();
    } catch (e) {}
    ambientGain = null;
  }
};
