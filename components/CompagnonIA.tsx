import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const CompagnonIA: React.FC<Props> = ({ mode, userName, onClose }) => {
    const [topic, setTopic] = useState('');
    const [isTopicSelected, setIsTopicSelected] = useState(mode === 'coach'); // Coach doesn't strictly need a topic first, but Patient does.
    const [messages, setMessages] = useState<Message[]>([]);

    // Initialize messages only when topic is selected or for coach
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
    const [isLoading, setIsLoading] = useState(false);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState<{score: number, feedback: string, recommendedFiches: any[]} | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // ... (rest of useEffect and functions)

    const handleEvaluate = async () => {
        if (isEvaluating || messages.length < 3) return; // Need some history
        setIsEvaluating(true);
        try {
            const token = localStorage.getItem('token');
            // Filter out the first message (greeting)
            const history = messages
                .filter((_, index) => index > 0)
                .map(m => ({ role: m.role, text: m.text }));
            
            const response = await fetch('/api/gemini/evaluate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
        if (!trimmedInput || isLoading) return;

        const newUserMessage: Message = { role: 'user', text: trimmedInput };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            // Filter out the first message (greeting from model) to comply with Gemini API requirements
            // The API requires the first message in history to be from 'user'.
            const history = messages
                .filter((_, index) => index > 0)
                .map(m => ({ role: m.role, text: m.text }));
            
            // Send the chosen topic as 'context' to the backend
            const response = await fetch(`/api/gemini/${mode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: trimmedInput, history, context: topic }) 
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur API');
            }
            const data = await response.json();
            
            setMessages(prev => [...prev, { role: 'model', text: data.message }]);
        } catch (err: any) {
            console.error('Chat Error:', err);
            const errorMessage = err.message === 'Erreur API' 
                ? "Le coach est temporairement indisponible. Peux-tu réessayer dans un instant ?"
                : `Difficulté technique : ${err.message}. Peux-tu reformuler ?`;
            
            setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderChatMessage = (text: string) => {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-teal-700">$1</strong>')
            .replace(/^\s*[•|*|-]\s+(.*$)/gim, '<div class="flex items-start gap-1.5 ml-1 my-0.5"><span class="text-teal-500 mt-1">•</span><span class="text-sm">$1</span></div>');
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] min-h-[400px]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-teal-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <BrainCircuitIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{mode === 'coach' ? 'Coach PharmIA' : 'Patient Simulé'}</h3>
                            <p className="text-xs text-teal-100">{mode === 'coach' ? 'Entraînement & Révision' : `Simulation : ${topic || 'Choix en cours...'}`}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {mode === 'coach' && isTopicSelected && !evaluationResult && messages.length > 2 && (
                            <button 
                                onClick={handleEvaluate}
                                disabled={isEvaluating}
                                className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg transition-colors font-medium mr-2"
                            >
                                {isEvaluating ? 'Évaluation...' : 'Terminer & Évaluer'}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <XCircleIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {!isTopicSelected ? (
                    <div className="flex flex-col items-center justify-center flex-grow p-8 text-center space-y-6">
                        <div className="bg-orange-50 p-4 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-orange-500">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Quel cas souhaitez-vous traiter ?</h2>
                            <p className="text-slate-500">Entrez un thème (ex: Angine, Grippe, Diabète) pour générer un patient spécifique.</p>
                        </div>
                        <form 
                            className="w-full max-w-md flex gap-2"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if(topic.trim()) setIsTopicSelected(true);
                            }}
                        >
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="Ex: Mal de gorge, Fièvre..."
                                className="flex-grow px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                autoFocus
                            />
                            <button 
                                type="submit"
                                disabled={!topic.trim()}
                                className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
                            >
                                Commencer
                            </button>
                        </form>
                    </div>
                ) : evaluationResult ? (
                    <div className="flex-grow p-6 overflow-y-auto bg-slate-50">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-100 mb-4 ring-4 ring-white shadow-sm">
                                <span className="text-3xl font-bold text-teal-700">{evaluationResult.score}%</span>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Évaluation terminée</h2>
                            <p className="text-slate-500 text-sm">Sujet : {topic}</p>
                        </div>

                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 mb-6">
                            <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-500">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                Feedback du Coach
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">{evaluationResult.feedback}</p>
                        </div>

                        {evaluationResult.recommendedFiches && evaluationResult.recommendedFiches.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="font-semibold text-slate-800 mb-2">Mémofiches recommandées</h3>
                                {evaluationResult.recommendedFiches.map((fiche: any) => (
                                    <Link 
                                        key={fiche._id}
                                        to={`/memofiche/${fiche._id}`} 
                                        className="block bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group"
                                        onClick={onClose}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-slate-700 group-hover:text-teal-700">{fiche.title}</span>
                                            <ArrowRightIcon className="w-4 h-4 text-slate-400 group-hover:text-teal-500" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto bg-slate-50">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-4 py-2 rounded-2xl shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-teal-600 text-white rounded-br-none' 
                                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: renderChatMessage(msg.text) }} />
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="px-4 py-2 rounded-2xl bg-white border border-slate-100 rounded-bl-none shadow-sm">
                                        <Spinner className="h-5 w-5 text-teal-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input */}
                        {!evaluationResult && (
                        <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Tape ton message..."
                                    className="flex-grow px-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                                    disabled={isLoading}
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={isLoading || !inputValue.trim()}
                                    className="bg-teal-600 text-white p-2 rounded-full hover:bg-teal-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default CompagnonIA;
