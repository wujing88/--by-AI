import { SoundType } from '../types';

export class Metronome {
  audioCtx: AudioContext | null = null;
  masterGainNode: GainNode | null = null;
  nextNoteTime = 0;
  timerID: number | null = null;
  lookahead = 25.0; // ms
  scheduleAheadTime = 0.1; // s
  isPlaying = false;
  bpm = 60;
  onBeat: (() => void) | null = null;
  muted = false;
  soundType: SoundType = 'impact';
  private noiseBuffer: AudioBuffer | null = null;

  init() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    if (!this.masterGainNode && this.audioCtx) {
      this.masterGainNode = this.audioCtx.createGain();
      this.masterGainNode.gain.setValueAtTime(this.muted ? 0.0001 : 1.0, this.audioCtx.currentTime);
      this.masterGainNode.connect(this.audioCtx.destination);
    }
    if (!this.noiseBuffer && this.audioCtx) {
      const bufferSize = this.audioCtx.sampleRate * 1.5;
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    }
  }

  private getDestination(): AudioNode {
    return this.masterGainNode || this.audioCtx!.destination;
  }

  fadeIn(duration = 0.6) {
    this.init();
    if (!this.audioCtx || !this.masterGainNode || this.muted) return;
    const now = this.audioCtx.currentTime;
    this.masterGainNode.gain.cancelScheduledValues(now);
    this.masterGainNode.gain.setValueAtTime(Math.max(0.0001, this.masterGainNode.gain.value), now);
    this.masterGainNode.gain.linearRampToValueAtTime(1.0, now + duration);
  }

  fadeOut(duration = 0.6, onComplete?: () => void) {
    if (!this.audioCtx || !this.masterGainNode) {
      onComplete?.();
      return;
    }
    const now = this.audioCtx.currentTime;
    this.masterGainNode.gain.cancelScheduledValues(now);
    this.masterGainNode.gain.setValueAtTime(Math.max(0.0001, this.masterGainNode.gain.value), now);
    this.masterGainNode.gain.linearRampToValueAtTime(0.0001, now + duration);
    if (onComplete) {
      window.setTimeout(onComplete, Math.round(duration * 1000) + 30);
    }
  }

  setSoundType(type: SoundType) {
    this.soundType = type;
  }

  /**
   * 边缘预警音 (Edge Warning / Climax Surge Cue)
   * 专为 120BPM 冲刺阶段最后 10 秒设计的催化兴奋音效
   * 融合：
   * 1. 澎湃低频冲顶推力 (Sub-bass surge 45Hz -> 180Hz)
   * 2. 高频紧张酥麻泛音波 (Electric tension shimmer harmonics)
   * 3. 气流升温音 (Formant whisper whoosh)
   * 4. 动态紧迫度递增 (Urgency ramp as countdown ticks 10 -> 1)
   * @param remainingSecs 剩余秒数 (10 到 1)
   */
  playEdgeWarning(remainingSecs: number = 10) {
    this.init();
    if (!this.audioCtx || this.muted) return;
    const ctx = this.audioCtx;
    const dest = this.getDestination();
    const now = ctx.currentTime;

    // Intensity & pitch urgency ratio increases as countdown approaches 1
    const clampedSecs = Math.max(1, Math.min(10, remainingSecs));
    const urgency = 1 + (10 - clampedSecs) * 0.08; // 1.0 -> 1.72
    const baseFreq = 540 * urgency;

    // 1. Sub-bass visceral surge (低频膨胀冲击)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(50, now);
    subOsc.frequency.exponentialRampToValueAtTime(145 * urgency, now + 0.15);
    subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.85, now + 0.05);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    subOsc.connect(subGain);
    subGain.connect(dest);
    subOsc.start(now);
    subOsc.stop(now + 0.46);

    // 2. High-tension electric harmonic shimmer (酥麻催化高音泛音)
    const highOsc = ctx.createOscillator();
    const highGain = ctx.createGain();
    highOsc.type = 'triangle';
    highOsc.frequency.setValueAtTime(baseFreq, now);
    highOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.55, now + 0.26);
    highOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.9, now + 0.42);

    highGain.gain.setValueAtTime(0.001, now);
    highGain.gain.linearRampToValueAtTime(0.42 * Math.min(1.25, urgency), now + 0.04);
    highGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    highOsc.connect(highGain);
    highGain.connect(dest);
    highOsc.start(now);
    highOsc.stop(now + 0.43);

    // 3. Harmonic resonance bell for psychological surge
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(baseFreq * 1.5, now + 0.02);
    shimmerOsc.frequency.exponentialRampToValueAtTime(baseFreq * 2.1, now + 0.3);

    shimmerGain.gain.setValueAtTime(0.001, now);
    shimmerGain.gain.setValueAtTime(0.001, now + 0.02);
    shimmerGain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(dest);
    shimmerOsc.start(now + 0.02);
    shimmerOsc.stop(now + 0.36);

    // 4. Warm rushing air whoosh (升温气流催化)
    const noise = this.createNoiseSource(ctx);
    if (noise) {
      const filter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(850, now);
      filter.frequency.exponentialRampToValueAtTime(2600 * (urgency / 1.15), now + 0.22);
      filter.Q.setValueAtTime(2.2, now);

      noiseGain.gain.setValueAtTime(0.001, now);
      noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.07);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(dest);

      noise.start(now);
      noise.stop(now + 0.39);
    }
  }

  playSample(type?: SoundType, forcePlay: boolean = false) {
    this.init();
    if (!this.audioCtx) return;
    if (this.muted && !forcePlay) return;

    if (this.masterGainNode) {
      const now = this.audioCtx.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(1.0, now);
    }
    const sound = type || this.soundType;
    this.playTone(this.audioCtx.currentTime + 0.01, sound);
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    this.nextNoteTime += secondsPerBeat;
  }

  private createNoiseSource(ctx: AudioContext): AudioBufferSourceNode | null {
    if (!this.noiseBuffer) return null;
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = this.noiseBuffer;
    return noiseSource;
  }

  playTone(time: number, sound: SoundType) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const dest = this.getDestination();

    if (sound === 'impact') {
      // 1. 肉体撞击 (Deep flesh thud & visceral body collision)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      const baseFreq = this.bpm >= 120 ? 125 : this.bpm >= 90 ? 105 : this.bpm >= 60 ? 90 : 75;
      
      osc.frequency.setValueAtTime(baseFreq, time);
      osc.frequency.exponentialRampToValueAtTime(26, time + 0.18);
      
      gainNode.gain.setValueAtTime(0.95, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      
      osc.connect(gainNode);
      gainNode.connect(dest);
      
      osc.start(time);
      osc.stop(time + 0.19);

      // Flesh friction noise layer
      const noise = this.createNoiseSource(ctx);
      if (noise) {
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();
        
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(320, time);
        filter.Q.setValueAtTime(1.8, time);
        
        noiseGain.gain.setValueAtTime(0.55, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);
        
        noise.start(time);
        noise.stop(time + 0.07);
      }

    } else if (sound === 'moist') {
      // 2. 水声黏腻 (Wet fluid suction, lubrication squelch & pop)
      const noise = this.createNoiseSource(ctx);
      if (noise) {
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1650, time);
        filter.frequency.exponentialRampToValueAtTime(240, time + 0.11);
        filter.Q.setValueAtTime(4.5, time);

        noiseGain.gain.setValueAtTime(0.85, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);

        noise.start(time);
        noise.stop(time + 0.12);
      }

      // Bubble pop / suction squelch tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(680, time);
      osc.frequency.exponentialRampToValueAtTime(180, time + 0.08);

      gain.gain.setValueAtTime(0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.09);

      // Micro secondary squish
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(380, time + 0.035);
      osc2.frequency.exponentialRampToValueAtTime(120, time + 0.1);
      gain2.gain.setValueAtTime(0.001, time);
      gain2.gain.setValueAtTime(0.3, time + 0.035);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(time + 0.035);
      osc2.stop(time + 0.11);

    } else if (sound === 'slap') {
      // 3. 肌肤拍打 (Crisp skin-on-skin slap)
      const noise = this.createNoiseSource(ctx);
      if (noise) {
        const filter = ctx.createBiquadFilter();
        const noiseGain = ctx.createGain();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2100, time);
        filter.Q.setValueAtTime(2.2, time);

        noiseGain.gain.setValueAtTime(0.9, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(dest);

        noise.start(time);
        noise.stop(time + 0.05);
      }

      // Elastic rebound tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(750, time);
      osc.frequency.exponentialRampToValueAtTime(110, time + 0.07);

      gain.gain.setValueAtTime(0.7, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.07);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.08);

    } else if (sound === 'breath') {
      // 4. 温热喘息 (Sensual warm exhale, sigh & whisper formant)
      const noise = this.createNoiseSource(ctx);
      if (noise) {
        // Formant 1
        const filter1 = ctx.createBiquadFilter();
        const gain1 = ctx.createGain();
        filter1.type = 'bandpass';
        filter1.frequency.setValueAtTime(720, time);
        filter1.Q.setValueAtTime(3.2, time);

        gain1.gain.setValueAtTime(0.001, time);
        gain1.gain.linearRampToValueAtTime(0.65, time + 0.04);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.26);

        noise.connect(filter1);
        filter1.connect(gain1);
        gain1.connect(dest);

        // Formant 2
        const filter2 = ctx.createBiquadFilter();
        const gain2 = ctx.createGain();
        filter2.type = 'bandpass';
        filter2.frequency.setValueAtTime(1780, time);
        filter2.Q.setValueAtTime(3.8, time);

        gain2.gain.setValueAtTime(0.001, time);
        gain2.gain.linearRampToValueAtTime(0.4, time + 0.035);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

        noise.connect(filter2);
        filter2.connect(gain2);
        gain2.connect(dest);

        noise.start(time);
        noise.stop(time + 0.27);
      }

      // Warm vocal cord hum
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(135, time);
      osc.frequency.exponentialRampToValueAtTime(95, time + 0.24);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.35, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.24);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.25);

    } else if (sound === 'spring') {
      // 5. 床幔轻晃 (Bed frame spring squeak & rhythmic mattress rebound)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, time);
      osc.frequency.exponentialRampToValueAtTime(940, time + 0.045);
      osc.frequency.exponentialRampToValueAtTime(420, time + 0.11);

      gain.gain.setValueAtTime(0.55, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      osc.connect(gain);
      gain.connect(dest);
      osc.start(time);
      osc.stop(time + 0.12);

      // Rebound squeak
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(780, time + 0.04);
      osc2.frequency.exponentialRampToValueAtTime(520, time + 0.13);

      gain2.gain.setValueAtTime(0.001, time);
      gain2.gain.setValueAtTime(0.28, time + 0.04);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(time + 0.04);
      osc2.stop(time + 0.14);

    } else if (sound === 'heartbeat') {
      // 6. 狂热心跳 (Visceral thumping sub-bass lub-dub)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      const baseFreq = this.bpm >= 120 ? 140 : this.bpm >= 90 ? 115 : this.bpm >= 60 ? 95 : 80;
      
      osc.frequency.setValueAtTime(baseFreq, time);
      osc.frequency.exponentialRampToValueAtTime(25, time + 0.2);
      
      gain.gain.setValueAtTime(0.9, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      osc.connect(gain);
      gain.connect(dest);
      
      osc.start(time);
      osc.stop(time + 0.21);

      // Secondary lub-dub rebound
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 0.85, time + 0.075);
      osc2.frequency.exponentialRampToValueAtTime(20, time + 0.2);
      gain2.gain.setValueAtTime(0.001, time);
      gain2.gain.setValueAtTime(0.5, time + 0.075);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      osc2.connect(gain2);
      gain2.connect(dest);
      osc2.start(time + 0.075);
      osc2.stop(time + 0.21);
    }
  }

  scheduleNote(time: number) {
    if (!this.audioCtx) return;
    
    if (this.onBeat) {
      setTimeout(this.onBeat, Math.max(0, (time - this.audioCtx.currentTime) * 1000));
    }

    if (this.muted) return;

    this.playTone(time, this.soundType);
  }

  scheduler() {
    if (!this.audioCtx) return;
    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  start(bpm: number, withFadeIn: boolean = true) {
    this.init();
    this.bpm = bpm;
    if (withFadeIn) {
      this.fadeIn(0.5);
    }
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.nextNoteTime = this.audioCtx!.currentTime + 0.05;
      this.scheduler();
    }
  }

  stop(withFadeOut: boolean = false, duration: number = 0.5) {
    if (withFadeOut && this.audioCtx && this.isPlaying) {
      this.fadeOut(duration, () => {
        this.isPlaying = false;
        if (this.timerID !== null) {
          window.clearTimeout(this.timerID);
          this.timerID = null;
        }
      });
    } else {
      this.isPlaying = false;
      if (this.timerID !== null) {
        window.clearTimeout(this.timerID);
        this.timerID = null;
      }
    }
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
  }
  
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.audioCtx && this.masterGainNode) {
      const now = this.audioCtx.currentTime;
      this.masterGainNode.gain.cancelScheduledValues(now);
      this.masterGainNode.gain.setValueAtTime(Math.max(0.0001, this.masterGainNode.gain.value), now);
      this.masterGainNode.gain.linearRampToValueAtTime(muted ? 0.0001 : 1.0, now + 0.12);
    }
  }
}

export const metronome = new Metronome();
