import type { GameSettings } from '$lib/domain/types';

export type GameSound = 'cannon' | 'impact' | 'critical' | 'boarding' | 'coin' | 'ui';
export type MusicMood = 'title' | 'haven' | 'freeport' | 'sea' | 'battle' | 'storm' | 'aftermath';

const AUDIO_ASSETS = {
  ocean: '/audio/ocean-loop.ogg',
  harbor: '/audio/harbor-loop.ogg',
  rain: '/audio/rain-loop.ogg',
  cannon: '/audio/cannon-heavy.ogg',
  impact: '/audio/hull-impact.ogg'
} as const;
type AudioAssetId = keyof typeof AUDIO_ASSETS;

class SoundEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private effects?: GainNode;
  private ambience?: GainNode;
  private music?: GainNode;
  private compressor?: DynamicsCompressorNode;
  private reverb?: ConvolverNode;
  private reverbGain?: GainNode;
  private ambientSource?: AudioBufferSourceNode;
  private harborSource?: AudioBufferSourceNode;
  private weatherSource?: AudioBufferSourceNode;
  private weatherGain?: GainNode;
  private harborGain?: GainNode;
  private harborFilter?: BiquadFilterNode;
  private musicNodes: AudioScheduledSourceNode[] = [];
  private mood: MusicMood = 'title';
  private settings?: GameSettings;
  private buffers = new Map<AudioAssetId, AudioBuffer>();
  private assetsPromise?: Promise<void>;

  configure(settings: GameSettings): void {
    this.settings = settings;
    if (!this.context || !this.master || !this.effects || !this.ambience || !this.music) return;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVolume, now, 0.05);
    this.effects.gain.setTargetAtTime(settings.effectsVolume, now, 0.05);
    this.ambience.gain.setTargetAtTime(settings.ambienceVolume * 0.22, now, 0.15);
    this.music.gain.setTargetAtTime(settings.musicVolume * 0.16, now, 0.2);
  }

  async unlock(settings: GameSettings): Promise<void> {
    this.configure(settings);
    if (!this.context) this.createContext();
    if (this.context?.state === 'suspended') await this.context.resume();
    this.assetsPromise ??= this.loadAssets();
    await this.assetsPromise;
    if (!this.ambientSource) this.startOceanAmbience();
    if (!this.harborSource) this.startHarborAmbience();
    if (!this.weatherSource) this.startWeatherAmbience();
    if (!this.musicNodes.length) this.startMusic();
  }

  setMood(mood: MusicMood): void {
    if (this.mood === mood) return;
    this.mood = mood;
    if (this.context?.state === 'running') this.startMusic();
  }

  setSettlementActivity(population: number, activeProduction: number, weather: 'clear' | 'rain' | 'storm' | 'fog', fireCount: number): void {
    if (!this.context || !this.harborGain || !this.harborFilter) return;
    const now = this.context.currentTime;
    const activity = Math.min(1, population / 180 + activeProduction / 32);
    const weatherLift = weather === 'storm' ? .18 : weather === 'rain' ? .08 : 0;
    this.harborGain.gain.setTargetAtTime(.04 + activity * .18 + weatherLift + Math.min(.12, fireCount * .04), now, .8);
    this.harborFilter.frequency.setTargetAtTime(480 + activity * 920 + weatherLift * 1200, now, .8);
    this.weatherGain?.gain.setTargetAtTime(weather === 'storm' ? .46 : weather === 'rain' ? .28 : weather === 'fog' ? .035 : 0, now, 1.2);
  }

  play(sound: GameSound): void {
    if (!this.context || !this.effects || this.context.state !== 'running') return;
    if (sound === 'cannon') {
      if (!this.playSample('cannon', .92, .92 + Math.random() * .13)) this.cannon();
    }
    else if (sound === 'impact' || sound === 'critical') {
      if (!this.playSample('impact', sound === 'critical' ? .9 : .58, sound === 'critical' ? .78 : .92 + Math.random() * .12)) this.impact(sound === 'critical');
    }
    else if (sound === 'boarding') this.boarding();
    else this.chime(sound === 'coin' ? 620 : 360);
  }

  private createContext(): void {
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.effects = this.context.createGain();
    this.ambience = this.context.createGain();
    this.music = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = .004;
    this.compressor.release.value = .28;
    this.reverb = this.context.createConvolver();
    this.reverb.buffer = this.impulseBuffer(1.8, 2.6);
    this.reverbGain = this.context.createGain();
    this.reverbGain.gain.value = .13;
    this.effects.connect(this.master);
    this.effects.connect(this.reverb).connect(this.reverbGain).connect(this.master);
    this.ambience.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(this.compressor).connect(this.context.destination);
    this.configure(this.settings ?? ({ masterVolume: .8, effectsVolume: .8, ambienceVolume: .7 } as GameSettings));
  }

  private impulseBuffer(duration: number, decay: number): AudioBuffer {
    const context = this.context!;
    const buffer = context.createBuffer(2, Math.ceil(context.sampleRate * duration), context.sampleRate);
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / data.length, decay);
    }
    return buffer;
  }

  private async loadAssets(): Promise<void> {
    if (!this.context) return;
    await Promise.all(Object.entries(AUDIO_ASSETS).map(async ([id, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        this.buffers.set(id as AudioAssetId, await this.context!.decodeAudioData(await response.arrayBuffer()));
      } catch {
        // Runtime synthesis remains available when a browser cannot decode Ogg/Vorbis.
      }
    }));
  }

  private playSample(id: AudioAssetId, volume: number, rate = 1): boolean {
    const buffer = this.buffers.get(id);
    if (!buffer || !this.context || !this.effects) return false;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const pan = this.context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    gain.gain.value = volume;
    pan.pan.value = (Math.random() - .5) * .45;
    source.connect(gain).connect(pan).connect(this.effects);
    source.start();
    return true;
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
    source.buffer = this.buffers.get('ocean') ?? this.noiseBuffer(7);
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.value = 720;
    filter.Q.value = .5;
    gain.gain.value = .55;
    source.connect(filter).connect(gain).connect(this.ambience!);
    source.start();
    this.ambientSource = source;
  }

  private startHarborAmbience(): void {
    const context = this.context!;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = this.buffers.get('harbor') ?? this.noiseBuffer(9);
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 620;
    filter.Q.value = 1.8;
    gain.gain.value = .04;
    source.connect(filter).connect(gain).connect(this.ambience!);
    source.start();
    this.harborSource = source;
    this.harborGain = gain;
    this.harborFilter = filter;
  }

  private startWeatherAmbience(): void {
    const buffer = this.buffers.get('rain');
    if (!buffer || !this.context || !this.ambience) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain).connect(this.ambience);
    source.start();
    this.weatherSource = source;
    this.weatherGain = gain;
  }

  private startMusic(): void {
    if (!this.context || !this.music) return;
    for (const node of this.musicNodes) { try { node.stop(); } catch { /* already stopped */ } }
    this.musicNodes = [];
    const context = this.context;
    const palettes: Record<MusicMood, { root: number; ratios: number[]; pulse: number; color: OscillatorType }> = {
      title: { root: 55, ratios: [1, 1.5, 2], pulse: .055, color: 'triangle' },
      haven: { root: 65.41, ratios: [1, 1.25, 1.5], pulse: .04, color: 'triangle' },
      freeport: { root: 73.42, ratios: [1, 1.2, 1.5], pulse: .09, color: 'sawtooth' },
      sea: { root: 61.74, ratios: [1, 1.333, 2], pulse: .045, color: 'sine' },
      battle: { root: 55, ratios: [1, 1.189, 1.498], pulse: .16, color: 'sawtooth' },
      storm: { root: 46.25, ratios: [1, 1.414, 2], pulse: .12, color: 'sawtooth' },
      aftermath: { root: 58.27, ratios: [1, 1.25, 1.498], pulse: .035, color: 'triangle' }
    };
    const palette = palettes[this.mood];
    palette.ratios.forEach((ratio, index) => {
      const oscillator = context.createOscillator();
      const voiceGain = context.createGain();
      const filter = context.createBiquadFilter();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : palette.color;
      oscillator.frequency.value = palette.root * ratio;
      voiceGain.gain.value = index === 0 ? .13 : .035;
      filter.type = 'lowpass';
      filter.frequency.value = this.mood === 'battle' ? 520 : 340;
      lfo.frequency.value = palette.pulse * (1 + index * .17);
      lfoGain.gain.value = index === 0 ? .025 : .012;
      lfo.connect(lfoGain).connect(voiceGain.gain);
      oscillator.connect(filter).connect(voiceGain).connect(this.music!);
      oscillator.start(); lfo.start();
      this.musicNodes.push(oscillator, lfo);
    });
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
