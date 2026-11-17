// Every sound is synthesised with WebAudio: no sound files, no network. The audio
// context is created lazily on the first user gesture (browsers block sound before
// one), every call is guarded, and M toggles mute. A shot scene never needs sound.

export function createSoundBank() {
  let context = null;
  let master = null;
  let pad = null;
  let muted = false;

  /** Build the context and the quiet ambient pad. Called from a user gesture. */
  function unlock() {
    try {
      if (context !== null) {
        if (context.state === 'suspended') void context.resume();
        return;
      }
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContext === undefined) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      startPad();
    } catch {
      context = null;
    }
  }

  /** Two detuned low sines under everything, barely there. */
  function startPad() {
    try {
      const gain = context.createGain();
      gain.gain.value = 0.045;
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 320;
      for (const freq of [55, 82.5, 110.3]) {
        const osc = context.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (freq === 82.5 ? 4 : -3);
        osc.connect(gain);
        osc.start();
      }
      const lfo = context.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoGain = context.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      lfo.start();
      gain.connect(lowpass);
      lowpass.connect(master);
      pad = gain;
    } catch {
      pad = null;
    }
  }

  /** One short tone: an oscillator with a quick attack and a decay. */
  function tone(freq, type, seconds, volume, slideTo) {
    if (context === null || muted) return;
    try {
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), now + seconds);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      osc.stop(now + seconds + 0.05);
    } catch {
      // Sound is garnish: a failure here must never break the game.
    }
  }

  /** A burst of filtered noise, for impacts and the Nova. */
  function noise(seconds, volume, fromFreq, toFreq) {
    if (context === null || muted) return;
    try {
      const now = context.currentTime;
      const length = Math.max(1, Math.floor(context.sampleRate * seconds));
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
      const source = context.createBufferSource();
      source.buffer = buffer;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(fromFreq, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), now + seconds);
      const gain = context.createGain();
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start(now);
      source.stop(now + seconds + 0.05);
    } catch {
      // Sound is garnish.
    }
  }

  return {
    unlock,
    /** The pickup chime climbs a semitone with each step of the combo. */
    pickup(combo) {
      const step = Math.min(combo - 1, COMBO_STEPS);
      tone(523.25 * Math.pow(2, step / 12), 'sine', 0.16, 0.32);
      tone(1046.5 * Math.pow(2, step / 12), 'sine', 0.1, 0.1);
    },
    ember() {
      tone(659.25, 'triangle', 0.18, 0.3, 880);
    },
    prism() {
      tone(523.25, 'sine', 0.12, 0.3);
      setTimeout(() => tone(659.25, 'sine', 0.12, 0.3), 70);
      setTimeout(() => tone(783.99, 'sine', 0.2, 0.3), 140);
    },
    hurt() {
      tone(150, 'sawtooth', 0.28, 0.4, 55);
      noise(0.18, 0.25, 900, 120);
    },
    nova() {
      noise(0.7, 0.35, 400, 4200);
      tone(261.63, 'triangle', 0.6, 0.22);
      tone(329.63, 'triangle', 0.6, 0.22);
      tone(392, 'triangle', 0.6, 0.22);
    },
    level() {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, index) => {
        setTimeout(() => tone(freq, 'triangle', 0.22, 0.3), index * 90);
      });
    },
    over() {
      const notes = [392, 329.63, 261.63, 196];
      notes.forEach((freq, index) => {
        setTimeout(() => tone(freq, 'triangle', 0.3, 0.28), index * 160);
      });
    },
    start() {
      tone(440, 'sine', 0.14, 0.3);
      setTimeout(() => tone(660, 'sine', 0.2, 0.3), 90);
    },
    /** M toggles the master gain; the pad keeps playing silently underneath. */
    toggleMute() {
      muted = !muted;
      if (master !== null) {
        try {
          master.gain.value = muted ? 0 : 0.5;
        } catch {
          // Nothing to do.
        }
      }
      return muted;
    },
    get isMuted() {
      return muted;
    },
  };
}

/** How far the pickup chime climbs before it stops rising. */
const COMBO_STEPS = 12;
