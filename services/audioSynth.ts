/**
 * Eldritch Resonator Audio Engine
 * Simulates the "Sparking" and "Humming" sound of Doctor Strange's magic
 * using Web Audio API procedural synthesis (Pink Noise + Sawtooth Drones).
 */
export class MagicAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  // Nodes for the "Hum/Drone" layer
  private droneOscillators: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;

  // Nodes for the "Spark/Crackling" layer
  private noiseBuffer: AudioBuffer | null = null;
  private sparkSource: AudioBufferSourceNode | null = null;
  private sparkFilter: BiquadFilterNode | null = null;
  private sparkGain: GainNode | null = null;

  constructor() {
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      // Generate Pink Noise Buffer (better for fire/sparks than white noise)
      if (this.ctx) {
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds loop
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          data[i] *= 0.11; // Normalize roughly to -1..1
          b6 = white * 0.115926;
        }
      }
    } catch (e) {
      console.error("AudioContext not supported");
    }
  }

  async start() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    if (this.droneOscillators.length > 0) return; // Already running

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    // --- 1. The Drone Layer (The Hum) ---
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0;
    
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 100;
    this.droneFilter.Q.value = 1; // Resonance

    // LFO to create the unstable "wobble"
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 15; // 15Hz wobble
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 50; // Modulate filter by 50hz
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);
    this.lfo.start();

    // Create dual oscillators for interference
    const freqs = [50, 52]; // 50Hz base, slight detune for beating effect
    freqs.forEach(f => {
      const osc = this.ctx!.createOscillator();
      osc.type = 'sawtooth'; // Sawtooth sounds more "electrical"
      osc.frequency.value = f;
      osc.connect(this.droneFilter!);
      osc.start();
      this.droneOscillators.push(osc);
    });

    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    // --- 2. The Spark Layer (The Crackle) ---
    if (this.noiseBuffer) {
        this.sparkSource = this.ctx.createBufferSource();
        this.sparkSource.buffer = this.noiseBuffer;
        this.sparkSource.loop = true;
        
        this.sparkFilter = this.ctx.createBiquadFilter();
        this.sparkFilter.type = 'highpass'; // Only hear the high fizz
        this.sparkFilter.frequency.value = 3000;
        
        this.sparkGain = this.ctx.createGain();
        this.sparkGain.gain.value = 0;

        this.sparkSource.connect(this.sparkFilter);
        this.sparkFilter.connect(this.sparkGain);
        this.sparkGain.connect(this.masterGain);
        
        this.sparkSource.start();
    }
  }

  updateIntensity(intensity: number, isPresent: boolean) {
    if (!this.ctx || !this.droneGain || !this.droneFilter || !this.sparkGain || !this.sparkFilter) return;

    const time = this.ctx.currentTime;
    
    if (isPresent) {
        // Drone Volume
        const droneVol = 0.1 + (intensity * 0.2);
        this.droneGain.gain.setTargetAtTime(droneVol, time, 0.1);
        
        // Drone Filter: Opens up as you make gestures
        const droneFreq = 120 + (intensity * 400); 
        this.droneFilter.frequency.setTargetAtTime(droneFreq, time, 0.1);

        // Spark Volume
        const sparkVol = 0.05 + (intensity * 0.4); // Sparks get much louder
        this.sparkGain.gain.setTargetAtTime(sparkVol, time, 0.05);

        // Spark Filter: Frequency drops slightly to let more "body" of the noise through when intense
        // But mostly stays high to sound like electricity
        const sparkFreq = 4000 - (intensity * 2000); 
        this.sparkFilter.frequency.setTargetAtTime(sparkFreq, time, 0.1);

    } else {
        // Fade out
        this.droneGain.gain.setTargetAtTime(0, time, 0.5);
        this.sparkGain.gain.setTargetAtTime(0, time, 0.2);
    }
  }

  triggerSpark() {
    // Optional: Extra loud burst
    if (!this.ctx || !this.sparkGain) return;
    const time = this.ctx.currentTime;
    this.sparkGain.gain.cancelScheduledValues(time);
    this.sparkGain.gain.setValueAtTime(0.8, time);
    this.sparkGain.gain.exponentialRampToValueAtTime(0.1, time + 0.1);
  }
}

export const audioManager = new MagicAudioEngine();