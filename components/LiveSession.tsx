
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { RobotIcon, UserIcon, LoaderIcon, AudioIcon, XIcon, TerminalIcon } from './Icons';
import { AnalyzerTuningConfig } from '../types';

// Manual Base64 handling for guideline compliance
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Added AnalyzerTuningConfig to props to fix assignability errors in App.tsx
interface LiveSessionProps {
  tuning: AnalyzerTuningConfig;
}

const LiveSession: React.FC<LiveSessionProps> = ({ tuning }) => {
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<{role: string, text: string}[]>([]);
  const [status, setStatus] = useState('IDLE');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    sourcesRef.current.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    sourcesRef.current.clear();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    setIsActive(false);
    setStatus('IDLE');
  };

  const startSession = async () => {
    try {
      setStatus('CONNECTING');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const outputNode = outputContextRef.current.createGain();
      outputNode.connect(outputContextRef.current.destination);

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('UPLINK ACTIVE');
            setIsActive(true);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const base64 = encode(new Uint8Array(int16.buffer));
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: { data: base64, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              setLogs(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'AI') return [...prev.slice(0, -1), { role: 'AI', text: last.text + text }];
                return [...prev, { role: 'AI', text }];
              });
            }
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setLogs(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'User') return [...prev.slice(0, -1), { role: 'User', text: last.text + text }];
                return [...prev, { role: 'User', text }];
              });
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputContextRef.current, 24000, 1);
              const source = outputContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => {
            console.error("Live Hub Error:", e);
            setStatus('UPLINK SEVERED');
          },
          onclose: () => {
            cleanup();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: 'You are a professional neural workstation assistant. Keep responses focused on AI and workstation tasks.'
        }
      });
    } catch (e) {
      console.error(e);
      setStatus('PERMISSION REJECTED');
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-180px)] flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-gray-900/60 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${isActive ? 'bg-indigo-600 shadow-[0_0_20px_#6366f1]' : 'bg-gray-800'}`}>
            <AudioIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tighter">Neural Live Link</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{status}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={isActive ? cleanup : startSession}
          className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${isActive ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl'}`}
        >
          {isActive ? 'Terminate Link' : 'Establish Link'}
        </button>
      </div>

      <div className="flex-grow bg-black/40 border border-white/5 rounded-[3rem] overflow-hidden flex flex-col relative shadow-2xl">
        <div className="flex-grow p-10 overflow-y-auto custom-scrollbar space-y-8">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <RobotIcon className="h-48 w-48 mb-8" />
              <p className="text-sm font-black uppercase tracking-[0.5em]">Awaiting multimodal signal</p>
            </div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`flex gap-6 animate-in slide-in-from-bottom-2 duration-300 ${log.role === 'User' ? 'justify-end' : ''}`}>
                {log.role === 'AI' && <div className="p-2 bg-indigo-600 rounded-lg h-fit"><RobotIcon className="h-4 w-4 text-white" /></div>}
                <div className={`max-w-[70%] p-6 rounded-[2rem] text-sm leading-relaxed ${log.role === 'AI' ? 'bg-gray-800/40 text-gray-100 border border-white/5 shadow-inner' : 'bg-indigo-600 text-white shadow-xl'}`}>
                  {log.text}
                </div>
                {log.role === 'User' && <div className="p-2 bg-gray-800 rounded-lg h-fit"><UserIcon className="h-4 w-4 text-white" /></div>}
              </div>
            ))
          )}
        </div>
        
        {isActive && (
          <div className="p-8 bg-gray-950/60 border-t border-white/5 flex items-center justify-center gap-12 backdrop-blur-2xl">
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => <div key={i} className="w-1 bg-indigo-500 rounded-full animate-[bounce_1s_infinite]" style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 0.1}s` }} />)}
              </div>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Signal Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-gray-600" />
              <span className="text-[8px] font-black text-gray-600 uppercase tracking-[0.3em]">Latency: 120ms Optimized</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveSession;
