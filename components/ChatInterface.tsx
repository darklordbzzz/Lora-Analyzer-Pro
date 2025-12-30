
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
    SendIcon, LoaderIcon, RobotIcon, TrashIcon, PaperclipIcon, 
    XIcon, ChevronDownIcon, InfoIcon, RefreshIcon, EditIcon, 
    PlusIcon, UserIcon, FileIcon, SearchIcon, FolderIcon,
    ChatIcon, ServerIcon, ImageIcon
} from './Icons';
import { streamChat } from '../services/llmService';
import { fileToBase64 } from '../services/fileService';
import type { LLMModel, ChatMessage, ChatAttachment, ChatConversation } from '../types';

const CHAT_HISTORY_KEY = 'lora-analyzer-pro-chat-sessions';

// Optimized Message List Component to prevent expensive re-renders during typing
const MessageList = React.memo(({ messages, isLoading, endRef }: { messages: ChatMessage[], isLoading: boolean, endRef: React.RefObject<HTMLDivElement> }) => {
    return (
        <div className="flex-grow overflow-y-auto custom-scrollbar px-6 py-8 space-y-8 bg-gray-900/10">
            {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale py-20 pointer-events-none text-center">
                    <ChatIcon className="h-32 w-32 mb-6" />
                    <h4 className="text-4xl font-black uppercase tracking-[0.4em]">Neural Link IDLE</h4>
                    <p className="text-sm font-black uppercase tracking-[0.2em] mt-2">Awaiting Logic Instruction</p>
                </div>
            ) : (
                messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className="flex items-center gap-3 mb-2 px-1">
                            {m.role === 'assistant' && <div className="p-1.5 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20"><RobotIcon className="h-4 w-4" /></div>}
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{m.role === 'user' ? 'Local Human' : 'Synthetic Hub'}</span>
                            {m.role === 'user' && <div className="p-1.5 bg-gray-800 text-gray-400 rounded-lg border border-gray-700"><UserIcon className="h-4 w-4" /></div>}
                        </div>
                        
                        <div className={`max-w-[85%] lg:max-w-[75%] rounded-3xl p-5 shadow-xl border ${m.role === 'user' ? 'bg-indigo-600 text-white border-indigo-500 rounded-tr-none' : 'bg-gray-800/80 text-gray-200 border-gray-700/50 rounded-tl-none'}`}>
                            {m.thought && (
                                <div className="mb-4 bg-black/30 rounded-xl p-3 border-l-2 border-indigo-500/50 text-[11px] font-mono text-gray-400 leading-relaxed italic">
                                    <div className="text-[9px] font-black uppercase text-indigo-400 mb-1 opacity-60">Architectural Reasoning</div>
                                    {m.thought}
                                </div>
                            )}
                            <div className="text-sm leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
                                {m.content}
                            </div>
                            {m.attachments && m.attachments.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {m.attachments.map((a, i) => (
                                        <div key={i} className="group relative">
                                            {a.mimeType.startsWith('image/') ? (
                                                <img src={a.data.startsWith('data:') ? a.data : `data:${a.mimeType};base64,${a.data}`} alt={a.name} className="h-32 rounded-xl object-cover border border-white/10 shadow-lg" />
                                            ) : (
                                                <div className="px-4 py-2 bg-black/40 rounded-xl border border-white/5 flex items-center gap-2 text-[10px] font-mono">
                                                    <FileIcon className="h-4 w-4" /> {a.name}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
            {isLoading && (
                <div className="flex items-center gap-4 animate-pulse px-2">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                </div>
            )}
            <div ref={endRef} className="h-1" />
        </div>
    );
});

const ChatInterface: React.FC<{ activeModel?: LLMModel }> = ({ activeModel }) => {
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<{file: File, base64: string}[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const persistenceTimeoutRef = useRef<any>(null);

    // Initial load
    useEffect(() => {
        const stored = localStorage.getItem(CHAT_HISTORY_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as ChatConversation[];
                if (Array.isArray(parsed)) {
                    setConversations(parsed);
                    if (parsed.length > 0) setCurrentId(parsed[0].id);
                }
            } catch (e) {
                console.error("Failed to load chat history", e);
            }
        }
    }, []);

    // Optimized Persistence Logic
    useEffect(() => {
        if (conversations.length > 0) {
            if (persistenceTimeoutRef.current) clearTimeout(persistenceTimeoutRef.current);
            persistenceTimeoutRef.current = setTimeout(() => {
                localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(conversations));
            }, 1000);
        }
        return () => { if (persistenceTimeoutRef.current) clearTimeout(persistenceTimeoutRef.current); };
    }, [conversations]);

    const activeConversation = useMemo(() => conversations.find(c => c.id === currentId), [conversations, currentId]);
    const messages = useMemo(() => activeConversation?.messages || [], [activeConversation]);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
    }, [messages, isLoading]);

    const handleNewChat = () => {
        const newId = crypto.randomUUID();
        const newConv: ChatConversation = { id: newId, title: 'New Session', messages: [], timestamp: Date.now(), modelId: activeModel?.id || '' };
        setConversations(prev => [newConv, ...(prev || [])]);
        setCurrentId(newId);
        setAttachments([]);
        setInput('');
    };

    const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Terminate this session?")) {
            const updated = (conversations || []).filter(c => c.id !== id);
            setConversations(updated);
            if (currentId === id) setCurrentId(updated.length > 0 ? updated[0].id : null);
        }
    };

    const updateMessagesForCurrent = useCallback((updater: (prev: ChatMessage[]) => ChatMessage[]) => {
        setConversations(prev => (prev || []).map(c => {
            if (c.id === currentId) {
                const updatedMsgs = updater(c.messages || []);
                let title = c.title;
                if (updatedMsgs.length > 0 && c.title === 'New Session') {
                    const firstMsg = updatedMsgs[0].content;
                    title = firstMsg.slice(0, 30) || 'New Session';
                }
                return { ...c, messages: updatedMsgs, title, timestamp: Date.now() };
            }
            return c;
        }));
    }, [currentId]);

    const runInference = async (history: ChatMessage[], assistantId: string) => {
        if (!activeModel) return;
        setIsLoading(true);
        try {
            await streamChat(history, activeModel, (chunk, thought) => {
                updateMessagesForCurrent(prev => (prev || []).map(m => m.id === assistantId ? { 
                    ...m, 
                    content: (m.content || '') + (chunk || ''), 
                    thought: (m.thought || '') + (thought || '') 
                } : m));
            });
        } catch (e: any) {
            updateMessagesForCurrent(prev => (prev || []).map(m => m.id === assistantId ? { ...m, content: (m.content || '') + `\n\n[PROTOCOL ERROR]: ${e.message}` } : m));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if ((!input.trim() && (attachments || []).length === 0) || !activeModel || isLoading) return;
        
        const userMsg: ChatMessage = { 
            id: crypto.randomUUID(), 
            role: 'user', 
            content: input, 
            attachments: (attachments || []).map(a => ({ name: a.file.name, mimeType: a.file.type, data: a.base64 })), 
            timestamp: Date.now() 
        };
        
        const assistantId = crypto.randomUUID();
        const newAssistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() };

        const currentHistory = [...messages, userMsg];
        updateMessagesForCurrent(prev => [...prev, userMsg, newAssistantMsg]);
        setInput('');
        setAttachments([]);
        
        await runInference(currentHistory, assistantId);
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newAttachments = await Promise.all(files.map(async (file: File) => ({
            file,
            base64: await fileToBase64(file)
        })));
        setAttachments(prev => [...prev, ...newAttachments]);
        e.target.value = '';
    };

    return (
        <div className="max-w-7xl mx-auto flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
            {/* SESSION SIDEBAR */}
            <div className={`flex flex-col bg-gray-800/40 border border-gray-700/50 rounded-[2.5rem] transition-all duration-500 overflow-hidden shadow-2xl backdrop-blur-sm ${isSidebarOpen ? 'w-80' : 'w-0'}`}>
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Recent Signals</span>
                    <button onClick={handleNewChat} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg active:scale-90"><PlusIcon className="h-4 w-4" /></button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {conversations.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => setCurrentId(c.id)}
                            className={`w-full group px-4 py-4 rounded-2xl transition-all text-left flex items-center justify-between border ${currentId === c.id ? 'bg-indigo-600/10 border-indigo-500/30' : 'hover:bg-gray-800 border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <div className="min-w-0 flex flex-col">
                                <span className={`text-[11px] font-black truncate uppercase tracking-tighter ${currentId === c.id ? 'text-white' : 'text-gray-400'}`}>{c.title}</span>
                                <span className="text-[8px] font-bold opacity-40 uppercase mt-1">{new Date(c.timestamp).toLocaleDateString()}</span>
                            </div>
                            <button onClick={(e) => handleDeleteConversation(c.id, e)} className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"><TrashIcon className="h-3.5 w-3.5" /></button>
                        </button>
                    ))}
                </div>
            </div>

            {/* MAIN CHAT */}
            <div className="flex-grow flex flex-col bg-gray-800/40 border border-gray-700/50 rounded-[3rem] overflow-hidden shadow-2xl relative backdrop-blur-sm">
                <div className="p-6 border-b border-gray-700/50 flex justify-between items-center bg-gray-900/40 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-800 text-gray-500 hover:text-white rounded-xl border border-gray-700 transition-all"><ChevronDownIcon className={`h-5 w-5 transition-transform ${isSidebarOpen ? 'rotate-90' : '-rotate-90'}`} /></button>
                        <div>
                            <h2 className="font-black text-lg uppercase tracking-tight text-white">{activeConversation?.title || 'Signal Interface'}</h2>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                {activeModel?.name || 'Kernel Disconnected'}
                            </p>
                        </div>
                    </div>
                </div>

                <MessageList messages={messages} isLoading={isLoading} endRef={messagesEndRef} />

                {/* INPUT AREA */}
                <div className="p-6 bg-gray-950/40 border-t border-gray-700/50 relative z-20">
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2">
                            {attachments.map((a, i) => (
                                <div key={i} className="relative group">
                                    {a.file.type.startsWith('image/') ? (
                                        <img src={`data:${a.file.type};base64,${a.base64}`} className="h-20 w-20 rounded-xl object-cover border border-indigo-500/50" />
                                    ) : (
                                        <div className="h-20 w-20 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center p-2"><FileIcon className="h-8 w-8 text-gray-700" /></div>
                                    )}
                                    <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform"><XIcon className="h-3 w-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                    
                    <div className="flex items-end gap-4 bg-gray-900 border border-gray-700/50 rounded-[2rem] p-3 shadow-inner focus-within:border-indigo-500/50 transition-all">
                        <button onClick={() => document.getElementById('chat-file-sub')?.click()} className="p-4 bg-gray-800 text-gray-500 hover:text-white rounded-full transition-all active:scale-90"><PaperclipIcon className="h-5 w-5" /></button>
                        <input id="chat-file-sub" type="file" multiple className="hidden" onChange={handleFile} />
                        
                        <textarea 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                            placeholder="Input logical query or technical instruction..."
                            className="flex-grow bg-transparent border-none focus:ring-0 text-gray-200 text-sm py-4 resize-none max-h-32 custom-scrollbar min-h-[56px]"
                        />

                        <button 
                            onClick={handleSend}
                            disabled={isLoading || (!input.trim() && attachments.length === 0)}
                            className={`p-5 rounded-full shadow-2xl transition-all active:scale-90 disabled:opacity-30 ${isLoading ? 'bg-gray-800' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        >
                            {isLoading ? <LoaderIcon className="h-6 w-6 animate-spin" /> : <SendIcon className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatInterface;
