import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { BrainCircuitIcon, Spinner, XCircleIcon, ArrowRightIcon } from './Icons';

interface Message {
    role: 'user' | 'model';
    text: string;
}

interface Props {
    mode: 'coach' | 'patient';
    userName: string;
    onClose: () => void;
}

// --- Typewriter Component for fluid text animation ---
const TypewriterMessage = ({ text, onComplete }: { text: string; onComplete?: () => void }) => {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);

    useEffect(() => {
        setDisplayedText('');
        indexRef.current = 0;
        
        const intervalId = setInterval(() => {
            if (indexRef.current < text.length) {
                setDisplayedText((prev) => prev + text.charAt(indexRef.current));
                indexRef.current++;
            } else {
                clearInterval(intervalId);
                if (onComplete) onComplete();
            }
        }, 15); // Fast speed: 15ms per character

        return () => clearInterval(intervalId);
    }, [text]); // Re-run if text changes (though ideally it shouldn't for same message instance)

    // Render markdown-like formatting (bold, bullet points) on the fly
    const renderContent = (content: string) => {
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-teal-800">$1</strong>') // Bold
            .replace(/^\s*[•|*|-]\s+(.*)/gm, '<div class="flex items-start gap-2 my-1"><span class="text-teal-500 mt-1.5 text-xs">●</span><span>$1</span></div>') // Bullets
            .replace(/\n/g, '<br />'); // Line breaks
    };

    return (
        <span 
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderContent(displayedText) }}
        />
    );
};

const CompagnonIA: React.FC<Props> = ({ mode, userName, onClose }) => {
    const [topic, setTopic] = useState('');
    const [isTopicSelected, setIsTopicSelected] = useState(mode === 'coach');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false); // Track if AI is currently "typing" the effect

    useEffect(() => {
        if (isTopicSelected && messages.length === 0) {
            setMessages([
                {
                    role: 'model',
                    text: mode === 'coach' 
                        ? `Bonjour ${userName} ! Je suis ton Coach PharmIA. Prêt à réviser ? Quel sujet t'intéresse aujourd'hui ?`
                        : `*Un client entre dans la pharmacie (Cas: ${topic})...* Bonjour, je ne me sens pas très bien...`
                }
            ]);
        }
    }, [isTopicSelected, mode, userName, topic, messages.length]);

    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Loading from API
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<{score: number, feedback: string, recommendedFiches: any[]} | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isLoading, isTyping]); // Scroll on new message, loading state, or typing effect

    const handleEvaluate = async () => {
        if (isEvaluating || messages.length < 3) return;
        setIsEvaluating(true);
        try {
            const token = localStorage.getItem('token');
            const history = messages
                .filter((_, index) => index > 0)
                .slice(-15)
                .map(m => ({ role: m.role, text: m.text }));
            
            const response = await fetch('/api/gemini/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ history, topic })
            });

            if (!response.ok) throw new Error('Erreur API');
            const data = await response.json();
            setEvaluationResult(data);
        } catch (err: any) {
            console.error(err);
            setMessages(prev => [...prev, { role: 'model', text: "Désolé, je n'ai pas pu générer l'évaluation." }]);
        } finally {
            setIsEvaluating(false);
        }
    };

    const sendMessage = async (message: string) => {
        const trimmedInput = message.trim();
        if (!trimmedInput || isLoading || isTyping) return; // Prevent sending while AI is typing

        const newUserMessage: Message = { role: 'user', text: trimmedInput };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const history = messages
                .filter((_, index) => index > 0)
                .slice(-10)
                .map(m => ({ role: m.role, text: m.text }));
            
            const response = await fetch(`/api/gemini/${mode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ message: trimmedInput, history, context: topic })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur API');
            }
            const data = await response.json();
            
            setIsTyping(true); // Start typewriter effect
            setMessages(prev => [...prev, { role: 'model', text: data.message }]);
        } catch (err: any) {
            console.error('Chat Error:', err);
            const errorMessage = err.message || "Une erreur est survenue.";
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setMessages([]);
        setTopic('');
        setEvaluationResult(null);
        setIsTopicSelected(mode === 'coach'); 
        setInputValue('');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[85vh] min-h-[500px] overflow-hidden border border-slate-100 ring-1 ring-white/20">
                {/* Header with Gradient */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-0.5 rounded-full shadow-md overflow-hidden flex-shrink-0">
                            <img src="/api/ftp/view?filePath=%2Fcoach.png" alt="PharmIA" className="h-10 w-10 object-cover" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg tracking-tight">{mode === 'coach' ? 'Coach PharmIA' : 'Patient Simulé'}</h3>
                            <p className="text-xs text-teal-50 font-medium tracking-wide uppercase opacity-90">{mode === 'coach' ? 'Mode Entraînement' : `Simulation : ${topic || '...'}`}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'coach' && isTopicSelected && !evaluationResult && messages.length > 2 && (
                            <button 
                                onClick={handleEvaluate}
                                disabled={isEvaluating || isLoading || isTyping}
                                className="bg-white/20 hover:bg-white/30 active:bg-white/40 text-white text-xs px-4 py-2 rounded-lg transition-all font-semibold mr-2 border border-white/10 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isEvaluating ? 'Calcul...' : 'Terminer & Évaluer'}
                            </button>
                        )}
                        <button 
                            onClick={handleReset} 
                            className="p-2.5 hover:bg-white/20 rounded-full transition-all text-white active:scale-90"
                            title="Réinitialiser"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </button>
                        <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-full transition-all active:scale-90">
                            <XCircleIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {!isTopicSelected ? (
                    <div className="flex flex-col items-center justify-center flex-grow p-10 text-center space-y-8 bg-slate-50/50">
                        <div className="bg-white p-6 rounded-full shadow-lg ring-4 ring-orange-50 animate-bounce-slow">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-14 h-14 text-orange-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Quel cas clinique ?</h2>
                            <p className="text-slate-500 text-lg">Choisissez un thème pour démarrer la simulation.</p>
                        </div>
                        <form 
                            className="w-full max-w-md flex gap-3 relative"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if(topic.trim()) setIsTopicSelected(true);
                            }}
                        >
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ex: Angine, Migraine, Diabète..."
                                className="flex-grow px-6 py-4 text-lg border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 focus:outline-none transition-all shadow-sm"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={!topic.trim()}
                                className="absolute right-2 top-2 bottom-2 bg-orange-600 text-white px-6 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-0 disabled:pointer-events-none shadow-md"
                            >
                                Go
                            </button>
                        </form>
                        <div className="flex gap-2 text-sm text-slate-400">
                            <span className="bg-white px-3 py-1 rounded-full border border-slate-200">Grippe</span>
                            <span className="bg-white px-3 py-1 rounded-full border border-slate-200">Gastro</span>
                            <span className="bg-white px-3 py-1 rounded-full border border-slate-200">Insomnie</span>
                        </div>
                    </div>
                ) : evaluationResult ? (
                    <div className="flex-grow p-8 overflow-y-auto bg-slate-50 animate-fade-in">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white mb-4 ring-8 ring-teal-50 shadow-lg relative">
                                <span className="text-4xl font-extrabold text-teal-600">{evaluationResult.score}%</span>
                                <div className="absolute -bottom-2 bg-teal-600 text-white text-xs px-3 py-1 rounded-full font-bold">SCORE</div>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Bilan de compétence</h2>
                            <p className="text-slate-500 font-medium">Sujet : {topic}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
                            <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-lg">
                                Feedback du Mentor
                            </h3>
                            <p className="text-slate-600 leading-relaxed text-base">{evaluationResult.feedback}</p>
                        </div>

                        {evaluationResult.recommendedFiches && evaluationResult.recommendedFiches.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="bg-orange-100 p-1 rounded-md overflow-hidden w-6 h-6 flex items-center justify-center">
                                        <img src="/api/ftp/view?filePath=%2Fcoach.png" alt="Coach" className="w-full h-full object-cover" />
                                    </span>
                                    Recommandations Ciblées
                                </h3>
                                <div className="grid gap-3">
                                {evaluationResult.recommendedFiches.map((fiche: any) => (
                                    <Link 
                                        key={fiche._id}
                                        to={`/memofiche/${fiche._id}`}
                                        className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all flex items-center justify-between"
                                        onClick={onClose}
                                    >
                                        <span className="font-semibold text-slate-700 group-hover:text-teal-700">{fiche.title}</span>
                                        <div className="bg-slate-50 p-2 rounded-full group-hover:bg-teal-50 transition-colors">
                                            <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                                        </div>
                                    </Link>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Chat Messages Area */}
                        <div ref={chatContainerRef} className="flex-grow p-6 space-y-6 overflow-y-auto bg-slate-50/50 scroll-smooth">
                            {messages.map((msg, index) => {
                                const isLastMessage = index === messages.length - 1;
                                const isModel = msg.role === 'model';
                                
                                return (
                                                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
                                                                    <div className={`max-w-[88%] p-4 rounded-2xl shadow-sm relative ${
                                                                        msg.role === 'user' 
                                                                        ? 'bg-teal-600 text-white rounded-br-none ml-12' 
                                                                        : 'bg-white text-slate-800 border border-slate-200/60 rounded-bl-none ml-12'
                                                                    }`}>
                                                                        {/* Avatar for AI */}
                                                                        {isModel && (
                                                                            <div className="absolute -left-12 bottom-0 w-9 h-9 bg-white rounded-full flex items-center justify-center border-2 border-teal-100 shadow-sm overflow-hidden flex-shrink-0">
                                                                                <img src="/api/ftp/view?filePath=%2Fcoach.png" alt="Coach" className="w-full h-full object-cover" />
                                                                            </div>
                                                                        )}                                        
                                        <div className="text-[15px]">
                                            {isModel && isLastMessage && isTyping ? (
                                                <TypewriterMessage 
                                                    text={msg.text} 
                                                    onComplete={() => setIsTyping(false)} 
                                                />
                                            ) : (
                                                // For user messages or old AI messages, render directly
                                                <span 
                                                    className="leading-relaxed"
                                                    dangerouslySetInnerHTML={{ 
                                                        __html: msg.text
                                                            .replace(/\*\*(.*?)\*\*/g, msg.role === 'user' ? '<strong>$1</strong>' : '<strong class="font-bold text-teal-800">$1</strong>')
                                                            .replace(/^\s*[•|*|-]\s+(.*)/gm, '<div class="flex items-start gap-2 my-1"><span class="text-teal-500 mt-1.5 text-xs">●</span><span>$1</span></div>')
                                                            .replace(/\n/g, '<br />')
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )})
                            }
                            
                            {/* Loading Indicator */}
                            {isLoading && (
                                <div className="flex justify-start animate-pulse">
                                    <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl rounded-bl-none shadow-sm ml-12 mr-12 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        {!evaluationResult && (
                        <div className="p-4 bg-white border-t border-slate-100 rounded-b-3xl relative z-20">
                            <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="relative flex items-end gap-2">
                                <textarea
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendMessage(inputValue);
                                        }
                                    }}
                                    placeholder="Répondez au coach..."
                                    className="w-full pl-5 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none resize-none text-slate-700 shadow-inner transition-all max-h-32 min-h-[56px]"
                                    disabled={isLoading || isTyping}
                                    autoFocus
                                    rows={1}
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || isTyping || !inputValue.trim()}
                                    className="absolute right-2 bottom-2 bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-all shadow-md active:scale-95 flex items-center justify-center group"
                                >
                                    {isLoading ? (
                                        <Spinner className="w-5 h-5 text-white" />
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
                                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                        </svg>
                                    )}
                                </button>
                            </form>
                            <div className="text-center mt-2">
                                <p className="text-[10px] text-slate-400 font-medium">Appuyez sur Entrée pour envoyer • Shift + Entrée pour un saut de ligne</p>
                            </div>
                        </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CompagnonIA;