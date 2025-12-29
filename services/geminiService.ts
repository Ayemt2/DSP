
import { GoogleGenAI } from "@google/genai";
import { FilterParams, SignalParams } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getFilterExplanation = async (filter: FilterParams, signal: SignalParams) => {
  const prompt = `
    As a Senior Communications Systems Professor, explain this hardware-simulated filter configuration to a graduate student.
    
    ENVIRONMENT:
    - Signal Source: ${signal.type} waveform
    - Carrier Freq: ${signal.frequency} Hz
    - Modulation (if AM/FM): ModFreq=${signal.modFreq}Hz, Depth=${signal.modDepth}
    
    FILTER BLOCK:
    - Type: ${filter.type.toUpperCase()}
    - Cutoff Frequency (f_c): ${filter.cutoff} Hz
    - Q-Factor: ${filter.q}
    - Tuning Mode: ${filter.mode}
    
    Explain in a professional "Lab Manual" style:
    1. The physical effect on the baseband or modulated signal.
    2. If it's a non-sine wave (Square/Triangle), explain "Harmonic Suppression" and how the waveform shape changes in the time domain.
    3. The trade-off between the Q-factor and the filter's stability/ringing in the impulse response.
    4. A specific use case in radio, telecommunications, or audio synthesis for this exact setup.
    
    Use technical terminology (Pass-band, Stop-band, Roll-off, Gibbs phenomenon where applicable).
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The analytical engine is currently offline. Please recalibrate your connection.";
  }
};
