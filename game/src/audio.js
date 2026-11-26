// Sound with no sound files: a WebAudio engine hum whose pitch follows the
// throttle, wind noise that grows with speed, and a thump on touchdown. The
// context is created on the first user gesture, so a silent screenshot run
// never touches audio at all.

export function createAudio() {
  let context = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let started = false;

  function ensure() {
    if (context) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      context = new AC();
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 70;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(context.destination);
      engineOsc.start();
      const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 500;
      windGain = context.createGain();
      windGain.gain.value = 0;
      noise.connect(filter);
      filter.connect(windGain);
      windGain.connect(context.destination);
      noise.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  return {
    /** Call from a user gesture; safe to call any number of times. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
    },
    /** Engine pitch and wind loudness follow the flight, every frame. */
    update(throttle, speed) {
      if (!started || !context) return;
      const t = context.currentTime;
      engineOsc.frequency.setTargetAtTime(55 + throttle * 75, t, 0.1);
      engineGain.gain.setTargetAtTime(0.02 + throttle * 0.05, t, 0.1);
      windGain.gain.setTargetAtTime(Math.min(0.06, speed * 0.001), t, 0.1);
    },
    /** A low thump when the wheels meet the runway. */
    thump(hard) {
      if (!ensure()) return;
      const osc = context.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hard ? 90 : 60, context.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, context.currentTime + 0.25);
      const gain = context.createGain();
      gain.gain.setValueAtTime(hard ? 0.5 : 0.3, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start();
      osc.stop(context.currentTime + 0.35);
    },
    silence() {
      if (!started) return;
      engineGain.gain.setTargetAtTime(0, context.currentTime, 0.1);
      windGain.gain.setTargetAtTime(0, context.currentTime, 0.1);
    },
  };
}
