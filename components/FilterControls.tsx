
import React from 'react';
import { FilterType, SignalType, FilterParams, SignalParams } from '../types';

interface FilterControlsProps {
  filter: FilterParams;
  setFilter: (f: FilterParams) => void;
  signal: SignalParams;
  setSignal: (s: SignalParams) => void;
  isAudioActive: boolean;
  toggleAudio: () => void;
  onAutoTune: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({ 
  filter, setFilter, signal, setSignal, isAudioActive, toggleAudio, onAutoTune 
}) => {
  return (
    <div className="bg-slate-800 p-5 rounded-xl shadow-2xl space-y-6 h-full border border-slate-700 overflow-y-auto">
      <section>
        <h2 className="text-sm font-bold mb-3 text-blue-400 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          Transmitter Source
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Carrier Waveform</label>
            <select 
              value={signal.type}
              onChange={(e) => setSignal({ ...signal, type: e.target.value as SignalType })}
              className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none"
            >
              <optgroup label="Standard">
                <option value={SignalType.SINE}>Pure Sine</option>
                <option value={SignalType.SQUARE}>Square (Harmonics)</option>
                <option value={SignalType.TRIANGLE}>Triangle</option>
              </optgroup>
              <optgroup label="Communication">
                <option value={SignalType.COMPOSITE}>Composite (Sum of Sines)</option>
                <option value={SignalType.AM}>AM Modulated</option>
                <option value={SignalType.FM}>FM Modulated</option>
              </optgroup>
              <optgroup label="Real-World">
                <option value={SignalType.NOISE}>White Noise (AWGN)</option>
                <option value={SignalType.VOICE}>Microphone Input</option>
              </optgroup>
            </select>
          </div>

          {(signal.type !== SignalType.VOICE && signal.type !== SignalType.NOISE) && (
            <div className="space-y-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div>
                <label className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                  <span>CARRIER FREQ</span>
                  <span className="text-blue-400 font-mono">{signal.frequency} Hz</span>
                </label>
                <input 
                  type="range" min="100" max="5000" step="10"
                  value={signal.frequency}
                  onChange={(e) => setSignal({ ...signal, frequency: Number(e.target.value) })}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              {(signal.type === SignalType.AM || signal.type === SignalType.FM) && (
                <>
                  <div>
                    <label className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                      <span>MOD FREQ</span>
                      <span className="text-purple-400 font-mono">{signal.modFreq} Hz</span>
                    </label>
                    <input 
                      type="range" min="5" max="200" step="1"
                      value={signal.modFreq}
                      onChange={(e) => setSignal({ ...signal, modFreq: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                  <div>
                    <label className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                      <span>MOD DEPTH / INDEX</span>
                      <span className="text-purple-400 font-mono">{signal.modDepth.toFixed(2)}</span>
                    </label>
                    <input 
                      type="range" min="0" max="1" step="0.01"
                      value={signal.modDepth}
                      onChange={(e) => setSignal({ ...signal, modDepth: Number(e.target.value) })}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <button 
            onClick={toggleAudio}
            className={`w-full py-3 px-4 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
              isAudioActive 
                ? 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20' 
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {isAudioActive ? 'Terminate Stream' : 'Initialize Laboratory'}
          </button>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            Filter Stage
          </h2>
          <div className="flex bg-slate-900 p-0.5 rounded-md border border-slate-700">
            <button 
              onClick={() => setFilter({...filter, mode: 'manual'})}
              className={`px-2 py-1 text-[10px] rounded ${filter.mode === 'manual' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400'}`}
            >MAN</button>
            <button 
              onClick={() => setFilter({...filter, mode: 'adaptive'})}
              className={`px-2 py-1 text-[10px] rounded ${filter.mode === 'adaptive' ? 'bg-emerald-500 text-slate-900' : 'text-slate-400'}`}
            >ADAPT</button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.values(FilterType).map((type) => (
              <button
                key={type}
                onClick={() => setFilter({ ...filter, type })}
                className={`py-2 px-1 text-[10px] font-bold rounded border transition-all ${
                  filter.type === type 
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500 text-slate-400'
                }`}
              >
                {type.toUpperCase()}
              </button>
            ))}
          </div>

          <div className={`space-y-3 transition-opacity ${filter.mode === 'adaptive' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <label className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                <span>CUTOFF (f_c)</span>
                <span className="text-emerald-400 font-mono">{filter.cutoff} Hz</span>
              </label>
              <input 
                type="range" min="20" max="8000" step="10"
                value={filter.cutoff}
                onChange={(e) => setFilter({ ...filter, cutoff: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
            <div>
              <label className="flex justify-between text-[10px] font-medium text-slate-400 mb-1">
                <span>Q (RESONANCE)</span>
                <span className="text-emerald-400 font-mono">{filter.q.toFixed(2)}</span>
              </label>
              <input 
                type="range" min="0.1" max="15" step="0.1"
                value={filter.q}
                onChange={(e) => setFilter({ ...filter, q: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {filter.mode === 'adaptive' && (
            <button 
              onClick={onAutoTune}
              className="w-full py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded-md text-[10px] font-bold uppercase hover:bg-emerald-500/30 transition-all"
            >
              Analyze & Auto-Tune Cutoff
            </button>
          )}
        </div>
      </section>
    </div>
  );
};

export default FilterControls;
