import type { GameSettings } from '$lib/domain/types';

export type GameSound = 'cannon' | 'impact' | 'critical' | 'boarding' | 'coin' | 'ui';

class SoundEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private ambience?: GainNode;
  private ambientSource?: AudioBufferSourceNode;
  private settings?: GameSettings;

  configure(settings: GameSettings): void {
    this.settings = settings;
    if (!this.context || !this.master || !this.effects || !this.ambience) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVolume, now, 0.05);
    this.effects.gain.setTargetAtTime(settings.effectsVolume, now, 0.05);
    this.ambience.gain.setTargetAtTime(settings.ambienceVolume * 0.22, now, 0.15);
  }

  async unlock(settings: GameSettings): Promise<void> {
    this.configure(settings);
    if (!this.context) this.createContext();
    if (this.context?.state === 'suspended') await this.context.resume();
    if (!this.ambientSource) this.startOceanAmbience();
  }

  play(sound: GameSound): void {
    if (!this.context || !this.effects || this.context.state !== 'running') return;
    if (sound === 'cannon') this.cannon();
    else if (sound === 'impact' || sound === 'critical') this.impact(sound === 'critical');
    else if (sound === 'boarding') this.boarding();
    else this.chime(sound === 'coin' ? 620 : 360);
  }

  private createContext(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.effects = this.context.createGain();
    this.ambience = this.context.createGain();
    this.effects.connect(this.master);
    this.ambience.connect(this.master);
    this.master.connect(this.context.destination);
    this.configure(this.settings ?? ({ masterVolume: .8, effectsVolume: .8, ambienceVolume: .7 } as GameSettings));
  }

  private noiseBuffer(duration: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * .985 + white * .015;
      data[index] = previous * 2.5;
    }
    return buffer;
  }

  private startOceanAmbience(): void {
    const context = this.context!;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.noiseBuffer(7);
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    filter.Q.value = .5;
    gain.gain.value = .55;
    source.connect(filter).connect(gain).connect(this.ambience!);
    source.start();
    this.ambientSource = source;
  }

  private cannon(): void {
    const context = this.context!;
    const now = context.currentTime;
    const boom = context.createOscillator();
    const boomGain = context.createGain();
    const blast = context.createBufferSource();
    const blastFilter = context.createBiquadFilter();
    const blastGain = context.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(88, now);
    boom.frequency.exponentialRampToValueAtTime(34, now + .5);
    boomGain.gain.setValueAtTime(.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(.92, now + .012);
    boomGain.gain.exponentialRampToValueAtTime(.0001, now + .65);
    blast.buffer = this.noiseBuffer(.8);
    blastFilter.type = 'lowpass';
    blastFilter.frequency.setValueAtTime(1800, now);
    blastFilter.frequency.exponentialRampToValueAtTime(160, now + .48);
    blastGain.gain.setValueAtTime(.78, now);
    blastGain.gain.exponentialRampToValueAtTime(.0001, now + .7);
    boom.connect(boomGain).connect(this.effects!);
    blast.connect(blastFilter).connect(blastGain).connect(this.effects!);
    boom.start(now); boom.stop(now + .7); blast.start(now); blast.stop(now + .8);
  }

  private impact(critical: boolean): void {
    const context = this.context!;
    const now = context.currentTime;
    const noise = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    noise.buffer = this.noiseBuffer(.45);
    filter.type = 'bandpass';
    filter.frequency.value = critical ? 460 : 680;
    filter.Q.value = .7;
    gain.gain.setValueAtTime(critical ? .85 : .52, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .42);
    noise.connect(filter).connect(gain).connect(this.effects!);
    noise.start(); noise.stop(now + .45);
  }

  private boarding(): void {
    this.chime(132);
    window.setTimeout(() => this.impact(false), 90);
  }

  private chime(frequency: number): void {
    const context = this.context!;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.18, now);
    gain.gain.exponentialRampToValueAtTime(.0001, now + .18);
    oscillator.connect(gain).connect(this.effects!);
    oscillator.start(); oscillator.stop(now + .2);
  }
}

export const soundEngine = new SoundEngine();
