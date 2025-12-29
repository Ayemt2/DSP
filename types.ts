
export enum FilterType {
  LOWPASS = 'lowpass',
  HIGHPASS = 'highpass',
  BANDPASS = 'bandpass',
  BANDSTOP = 'notch'
}

export enum SignalType {
  SINE = 'sine',
  SQUARE = 'square',
  TRIANGLE = 'triangle',
  COMPOSITE = 'composite',
  AM = 'am',
  FM = 'fm',
  VOICE = 'voice',
  NOISE = 'noise'
}

export interface FilterParams {
  type: FilterType;
  cutoff: number;
  q: number;
  order: number;
  mode: 'manual' | 'adaptive';
}

export interface SignalParams {
  type: SignalType;
  frequency: number;
  modFreq: number;
  modDepth: number;
  amplitude: number;
}
