
import React, { useState, useEffect, useRef, useCallback } from 'react';
import FilterControls from './components/FilterControls';
import Visualizer from './components/Visualizer';
import { FilterType, SignalType, FilterParams, SignalParams } from './types';
import { getFilterExplanation } from './services/geminiService';

const App: React.FC = () => {
  const [filter, setFilter] = useState<FilterParams>({
    type: FilterType.LOWPASS,
    cutoff: 1000,
    q: 1.0,
    order: 2,
    mode: 'manual'
  });

  const [signal, setSignal] = useState<SignalParams>({
    type: SignalType.SINE,
    frequency: 440,
    modFreq: 20,
    modDepth: 0.5,
    amplitude: 0.5
  });

  const [isAudioActive, setIsAudioActive] = useState(false);
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [snr, setSnr] = useState<number>(0);

  // Audio Engine Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainOscRef = useRef<OscillatorNode | null>(null);
  const modOscRef = useRef<OscillatorNode | null>(null);
  const modGainRef = useRef<GainNode | null>(null);
  const compositeOscsRef = useRef<OscillatorNode[]>([]);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const analyzerInputRef = useRef<AnalyserNode | null>(null);
  const analyzerOutputRef = useRef<AnalyserNode | null>(null);

  // Visualization Buffers
  const [timeData, setTimeData] = useState<any[]>([]);
  const [freqData, setFreqData] = useState<any[]>([]);
  const [impulseData, setImpulseData] = useState<any[]>([]);

  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    compositeOscsRef.current.forEach(o => o.stop());
    compositeOscsRef.current = [];
    setIsAudioActive(false);
  }, []);

  const initAudio = useCallback(async () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.4;

    const filterNode = ctx.createBiquadFilter();
    filterNodeRef.current = filterNode;

    const analyzerIn = ctx.createAnalyser();
    analyzerIn.fftSize = 2048;
    analyzerInputRef.current = analyzerIn;

    const analyzerOut = ctx.createAnalyser();
    analyzerOut.fftSize = 2048;
    analyzerOutputRef.current = analyzerOut;

    // Logic for Signal Generation
    const setupSignal = () => {
      if (signal.type === SignalType.AM) {
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        
        modulator.frequency.value = signal.modFreq;
        modGain.gain.value = signal.modDepth;
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency); // Actually this is FM behavior in Web Audio
        // For standard AM:
        const amGain = ctx.createGain();
        amGain.gain.value = 1.0 - signal.modDepth;
        modulator.connect(modGain);
        modGain.connect(amGain.gain);
        
        carrier.frequency.value = signal.frequency;
        carrier.connect(amGain);
        amGain.connect(analyzerIn);
        
        carrier.start();
        modulator.start();
        mainOscRef.current = carrier;
        modOscRef.current = modulator;
      } else if (signal.type === SignalType.FM) {
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        
        modulator.frequency.value = signal.modFreq;
        modGain.gain.value = signal.modDepth * signal.frequency; // FM Index
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        
        carrier.frequency.value = signal.frequency;
        carrier.connect(analyzerIn);
        
        carrier.start();
        modulator.start();
        mainOscRef.current = carrier;
        modOscRef.current = modulator;
      } else if (signal.type === SignalType.COMPOSITE) {
        [1, 2, 3.5].forEach((mult, i) => {
          const osc = ctx.createOscillator();
          osc.frequency.value = signal.frequency * mult;
          const g = ctx.createGain();
          g.gain.value = 0.3 / (i + 1);
          osc.connect(g);
          g.connect(analyzerIn);
          osc.start();
          compositeOscsRef.current.push(osc);
        });
      } else if (signal.type === SignalType.NOISE) {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(analyzerIn);
        src.start();
      } else if (signal.type === SignalType.VOICE) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const src = ctx.createMediaStreamSource(stream);
          src.connect(analyzerIn);
        });
      } else {
        const osc = ctx.createOscillator();
        osc.type = signal.type === SignalType.TRIANGLE ? 'triangle' : signal.type === SignalType.SQUARE ? 'square' : 'sine';
        osc.frequency.value = signal.frequency;
        osc.connect(analyzerIn);
        osc.start();
        mainOscRef.current = osc;
      }
    };

    setupSignal();
    analyzerIn.connect(filterNode);
    filterNode.connect(analyzerOut);
    analyzerOut.connect(masterGain);
    masterGain.connect(ctx.destination);

    setIsAudioActive(true);
  }, [signal]);

  useEffect(() => {
    if (filterNodeRef.current && audioCtxRef.current) {
      filterNodeRef.current.type = filter.type as BiquadFilterType;
      filterNodeRef.current.frequency.setTargetAtTime(filter.cutoff, audioCtxRef.current.currentTime, 0.05);
      filterNodeRef.current.Q.setTargetAtTime(filter.q, audioCtxRef.current.currentTime, 0.05);
    }
  }, [filter]);

  // Auto-tuning Logic
  const handleAutoTune = useCallback(() => {
    if (!analyzerInputRef.current) return;
    const data = new Float32Array(analyzerInputRef.current.frequencyBinCount);
    analyzerInputRef.current.getFloatFrequencyData(data);
    
    // Find dominant peak
    let maxIdx = 0;
    let maxVal = -Infinity;
    for(let i=0; i<data.length; i++) {
      if(data[i] > maxVal) {
        maxVal = data[i];
        maxIdx = i;
      }
    }
    const dominantFreq = (maxIdx * audioCtxRef.current!.sampleRate) / (2 * data.length);
    
    // Suggest cutoff based on type
    let suggested = dominantFreq;
    if (filter.type === FilterType.LOWPASS) suggested = dominantFreq * 1.5;
    if (filter.type === FilterType.HIGHPASS) suggested = dominantFreq * 0.7;
    
    setFilter(prev => ({...prev, cutoff: Math.min(8000, Math.round(suggested))}));
  }, [filter.type]);

  // Rendering loop
  useEffect(() => {
    let frame: number;
    const loop = () => {
      if (!isAudioActive || !analyzerInputRef.current || !analyzerOutputRef.current) return;
      
      const inT = new Float32Array(analyzerInputRef.current.fftSize);
      const outT = new Float32Array(analyzerOutputRef.current.fftSize);
      analyzerInputRef.current.getFloatTimeDomainData(inT);
      analyzerOutputRef.current.getFloatTimeDomainData(outT);

      // Time Data
      const tRes = [];
      const step = 4;
      for (let i = 0; i < 512; i += step) {
        tRes.push({ time: i, input: inT[i], output: outT[i] });
      }
      setTimeData(tRes);

      // Freq Data
      const inF = new Float32Array(analyzerInputRef.current.frequencyBinCount);
      const outF = new Float32Array(analyzerOutputRef.current.frequencyBinCount);
      analyzerInputRef.current.getFloatFrequencyData(inF);
      analyzerOutputRef.current.getFloatFrequencyData(outF);

      const fRes = [];
      for (let i = 0; i < 128; i++) {
        const freq = (i * audioCtxRef.current!.sampleRate) / analyzerInputRef.current!.fftSize;
        const inMag = Math.max(0, (inF[i] + 100) / 100);
        const outMag = Math.max(0, (outF[i] + 100) / 100);
        
        // Theoretical Curve
        let theoretical = 1;
        const normalized = freq / filter.cutoff;
        if (filter.type === FilterType.LOWPASS) theoretical = 1 / Math.sqrt(1 + Math.pow(normalized, 4));
        if (filter.type === FilterType.HIGHPASS) theoretical = 1 / Math.sqrt(1 + Math.pow(1/normalized, 4));

        fRes.push({ freq: Math.round(freq), inMag, outMag, response: theoretical });
      }
      setFreqData(fRes);

      // SNR Estimate (Input power vs Out-of-band reduction)
      const inputPower = inT.reduce((acc, val) => acc + val * val, 0);
      const outputPower = outT.reduce((acc, val) => acc + val * val, 0);
      setSnr(10 * Math.log10(inputPower / (outputPower + 0.00001)));

      // Impulse (Pseudo-calculation based on frequency response)
      const imp = [];
      for (let i = 0; i < 50; i++) {
        imp.push({ t: i, val: Math.exp(-i * (filter.cutoff/2000)) * Math.sin(i * (filter.cutoff/500)) });
      }
      setImpulseData(imp);

      frame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(frame);
  }, [isAudioActive, filter]);

  const handleExplain = async () => {
    setIsExplaining(true);
    const text = await getFilterExplanation(filter, signal);
    setExplanation(text || '');
    setIsExplaining(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-blue-500/30">
      <header className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">CommLab <span className="text-blue-500">v3.0</span></h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest">REAL-TIME SIGNAL ANALYSIS INTERFACE</p>
          </div>
        </div>
        <button 
          onClick={handleExplain}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-700 transition-all flex items-center gap-2"
        >
          {isExplaining ? 'GENERATING INSIGHTS...' : 'REQUEST DSP EXPLANATION'}
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        <aside className="lg:col-span-3">
          <FilterControls 
            filter={filter} 
            setFilter={setFilter} 
            signal={signal} 
            setSignal={setSignal}
            isAudioActive={isAudioActive}
            toggleAudio={isAudioActive ? stopAudio : initAudio}
            onAutoTune={handleAutoTune}
          />
        </aside>

        <section className="lg:col-span-9 flex flex-col gap-6 overflow-y-auto pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[500px] shrink-0">
            <Visualizer type="time" title="s(t) Temporal Domain" timeData={timeData} freqData={[]} impulseData={[]} />
            <Visualizer type="freq" title="S(f) Spectral Power" timeData={[]} freqData={freqData} impulseData={[]} />
            <Visualizer type="impulse" title="h(t) Filter Impulse Response" timeData={[]} freqData={[]} impulseData={impulseData} />
            
            <div className="bg-slate-900 border border-slate-700/50 p-6 rounded-xl flex flex-col justify-center items-center relative overflow-hidden">
              <div className="absolute top-4 left-4 text-[10px] text-slate-500 font-bold">LINK STATISTICS</div>
              <div className="text-center space-y-2">
                <div className="text-4xl font-black text-blue-500 font-mono">{snr.toFixed(1)} <span className="text-lg">dB</span></div>
                <div className="text-[10px] text-slate-400 font-bold">ESTIMATED ATTENUATION GAIN</div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 w-full">
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase">Status</div>
                  <div className="text-sm font-bold text-emerald-500 tracking-tighter">{isAudioActive ? 'SYNCHRONIZED' : 'STANDBY'}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase">Buffer</div>
                  <div className="text-sm font-bold text-slate-300">2048 SAMPLES</div>
                </div>
              </div>
            </div>
          </div>

          {explanation && (
            <div className="bg-slate-900/80 border border-blue-500/30 p-8 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in duration-300">
               <h3 className="text-blue-400 font-black mb-4 flex items-center gap-2">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                 PROFESSOR'S LABORATORY NOTES
               </h3>
               <div className="text-slate-300 prose prose-invert prose-sm max-w-none leading-relaxed whitespace-pre-line">
                 {explanation}
               </div>
            </div>
          )}
        </section>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 flex justify-between items-center text-[10px] text-slate-600 font-mono">
        <div>SYS: COMMUNICATION_LAB_SUITE // ACCESSED: {new Date().toLocaleTimeString()}</div>
        <div className="flex gap-4">
          <span>SAMPLING: 44.1KHZ</span>
          <span>QUANTIZATION: 16-BIT</span>
          <span className="text-blue-500">READY</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
