
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface VisualizerProps {
  timeData: { time: number; input: number; output: number }[];
  freqData: { freq: number; inMag: number; outMag: number; response: number }[];
  impulseData: { t: number; val: number }[];
  title: string;
  type: 'time' | 'freq' | 'impulse';
}

const Visualizer: React.FC<VisualizerProps> = ({ timeData, freqData, impulseData, title, type }) => {
  const chart = useMemo(() => {
    if (type === 'time') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" hide />
            <YAxis domain={[-1.2, 1.2]} stroke="#475569" fontSize={9} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
              labelStyle={{ display: 'none' }}
              itemStyle={{ fontSize: '10px' }}
            />
            <Line type="stepAfter" dataKey="input" stroke="#3b82f6" dot={false} strokeWidth={1} name="Input (s_in)" isAnimationActive={false} />
            <Line type="stepAfter" dataKey="output" stroke="#10b981" dot={false} strokeWidth={2} name="Filtered (s_out)" isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (type === 'impulse') {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={impulseData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="t" hide />
            <YAxis stroke="#475569" fontSize={9} />
            <Area type="monotone" dataKey="val" stroke="#f59e0b" fill="#f59e0b20" name="Impulse h(t)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={freqData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="freq" stroke="#475569" fontSize={9} minTickGap={20} />
            <YAxis domain={[0, 1.2]} stroke="#475569" fontSize={9} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
              itemStyle={{ fontSize: '10px' }}
            />
            <Area type="monotone" dataKey="inMag" stroke="#3b82f6" fill="transparent" strokeDasharray="3 3" name="In Spectrum" isAnimationActive={false} />
            <Area type="monotone" dataKey="outMag" stroke="#10b981" fill="url(#colorOut)" name="Out Spectrum" isAnimationActive={false} />
            <Line type="monotone" dataKey="response" stroke="#ef4444" dot={false} strokeWidth={1} name="H(f) Theory" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      );
    }
  }, [timeData, freqData, impulseData, type]);

  return (
    <div className="bg-slate-900 border border-slate-700/50 p-4 rounded-xl shadow-inner flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{title}</h3>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {chart}
      </div>
    </div>
  );
};

export default Visualizer;
