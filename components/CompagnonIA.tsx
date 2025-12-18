import React, { useState, useRef, useEffect } from 'react';
import { BrainCircuitIcon, Spinner, XCircleIcon } from './Icons';

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
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            text: mode === 'coach' 
                ? `Bonjour ${userName} ! Je suis ton Coach PharmIA. Que souhaites-tu réviser aujourd'hui ? Je peux te poser des questions sur les mémofiches pour tester tes connaissances.`
                : `*Un client entre dans la pharmacie...* Bonjour, je ne me sens pas très bien aujourd'hui, pouvez-vous m'aider ?`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (message: string) => {
        const trimmedInput = message.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage: Message = { role: 'user', text: trimmedInput };
        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const history = messages.map(m => ({ role: m.role, text: m.text }));
            
            const response = await fetch(`/api/gemini/${mode}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ message: trimmedInput, history })
            });

            if (!response.ok) throw new Error('Erreur API');
            const data = await response.json();
            
            setMessages(prev => [...prev, { role: 'model', text: data.message }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'model', text: "Désolé, je rencontre une petite difficulté technique. Peux-tu reformuler ?" }]);
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
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-teal-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <BrainCircuitIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold">{mode === 'coach' ? 'Coach PharmIA' : 'Patient Simulé'}</h3>
                            <p className="text-xs text-teal-100">{mode === 'coach' ? 'Entraînement & Révision' : 'Mise en situation réelle'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </div>

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
                <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Tape ton message..."
                            className="flex-grow px-4 py-2 border border-slate-200 rounded-full focus:ring-2 focus:ring-teal-500 focus:outline-none text-sm"
                            disabled={isLoading}
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
            </div>
        </div>
    );
};

export default CompagnonIA;
