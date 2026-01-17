
import React, { useState, useRef, useEffect } from 'react';
import * as gemini from '../services/geminiService';
import { SendIcon, LoaderIcon, RobotIcon, UserIcon, ChatIcon, GlobeIcon, LinkIcon } from './Icons';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    sources?: {uri: string, title: string}[];
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setIsStreaming(true);

    try {
      let fullContent = "";
      const sources = await gemini.chatWithGeminiStream(input, messages, (chunk) => {
        fullContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].content = fullContent;
          return updated;
        });
      });
      
      if (sources && sources.length > 0) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].sources = sources;
          return updated;
        });
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1].content = "Connection to intelligence core failed. Verify node status.";
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-180px)] flex flex-col glass-card rounded-[3rem] overflow-hidden shadow-2xl relative">
      <div className="scanning-line opacity-20"></div>
      
      <div className="p-6 border-b border-white/5 bg-gray-900/60 backdrop-blur-xl flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-hub-accent/20 rounded-2xl shadow-lg border border-hub-accent/30">
            <ChatIcon className="h-6 w-6 text-hub-accent" />
          </div>
          <div>
            <h2 className="font-black text-lg text-white uppercase tracking-tighter neon-text">Intelligence Core</h2>
            <div className="flex items-center gap-2 mt-1">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Grounding Node Active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto p-10 space-y-10 custom-scrollbar z-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-10">
            <RobotIcon className="h-40 w-40 mb-8" />
            <h4 className="text-3xl font-black uppercase tracking-[0.5em] text-white">Kernel Awaiting Uplink</h4>
            <p className="text-[10px] font-black uppercase mt-4 tracking-widest">Query the neural network for cross-platform insights</p>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${m.role === 'user' ? 'bg-hub-accent' : 'bg-gray-800'}`}>
                    {m.role === 'user' ? <UserIcon className="h-3 w-3 text-white" /> : <RobotIcon className="h-3 w-3 text-hub-accent" />}
                </div>
                <span className="text-[9px] font-black uppercase text-gray-500 tracking-[0.2em]">{m.role === 'user' ? 'Operator' : 'AI Core'}</span>
              </div>
              <div className={`max-w-[90%] md:max-w-[75%] px-8 py-5 rounded-[2rem] text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-hub-accent text-white shadow-[0_10px_30px_rgba(139,92,246,0.3)]' 
                  : 'bg-gray-800/40 text-gray-100 border border-white/5 backdrop-blur-md shadow-inner'
              }`}>
                <div className="prose prose-invert prose-sm">
                    {m.content || (isStreaming && i === messages.length - 1 ? <LoaderIcon className="h-4 w-4 animate-spin text-hub-accent" /> : '')}
                </div>
                
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
                    <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">
                      <GlobeIcon className="h-3 w-3" /> Grounding References
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {m.sources.map((s, si) => (
                        <a 
                          key={si} 
                          href={s.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-black/30 hover:bg-white/10 text-[10px] text-hub-accent rounded-lg flex items-center gap-2 transition-all border border-white/5"
                        >
                          <LinkIcon className="h-3 w-3" />
                          <span className="truncate max-w-[150px]">{s.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-8 bg-gray-950/60 border-t border-white/5 backdrop-blur-2xl z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4 bg-gray-900/80 border border-white/5 rounded-[2rem] p-4 shadow-2xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Transmit instruction to the core..."
            className="flex-grow bg-transparent border-none focus:ring-0 text-gray-200 text-sm py-4 px-4 resize-none h-16 custom-scrollbar placeholder:text-gray-600 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className={`p-5 rounded-2xl transition-all shadow-xl group ${
              !input.trim() || isStreaming 
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                : 'bg-hub-accent hover:bg-violet-500 text-white active:scale-90 hover:shadow-violet-500/40'
            }`}
          >
            <SendIcon className={`h-6 w-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform`} />
          </button>
        </div>
        <p className="text-[8px] text-center text-gray-600 font-black uppercase mt-4 tracking-[0.5em]">Cognitive stream encrypted • End-to-end neural verification</p>
      </div>
    </div>
  );
};

export default ChatInterface;
