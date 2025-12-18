import React, { useState, useRef, useEffect } from 'react';
import { sendRAGChatMessage } from '../services/geminiService';
import { Link } from 'react-router-dom';
import { BrainCircuitIcon, Spinner, MicIcon, MicOffIcon, SpeakerIcon, XCircleIcon } from './Icons';

interface Message {
    role: 'user' | 'model';
    text: string;
    sources?: any[];
}

const CustomChatBot: React.FC<{ context: string, title: string }> = ({ context, title }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :\n\n**${title}**\n\nComment puis-je vous aider aujourd'hui ?`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const stripMarkdown = (text: string) => {
        return text.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');
    };

    const renderChatMessage = (text: string) => {
        let rendered = text
            // Handle Bold (**text**)
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-teal-700">$1</strong>')
            // Handle Headers (### Title)
            .replace(/^### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-800 mt-2 mb-1 uppercase tracking-tight">$1</h4>')
            // Handle Bullet Points (* item or - item)
            .replace(/^\s*[*|-]\s+(.*$)/gim, '<div class="flex items-start gap-1.5 ml-1 my-0.5"><span class="text-teal-500 mt-1">•</span><span class="text-sm">$1</span></div>');
        
        return rendered;
    };

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
        setError(null);

        try {
            // Use the new RAG-based chat function with history
            // Filter out the first message if it's from the model (the greeting)
            const history = messages
                .filter((_, index) => index > 0) 
                .map(msg => ({ role: msg.role, text: msg.text }));
            
            const response = await sendRAGChatMessage(trimmedInput, history);
            const modelMessage: Message = { role: 'model', text: response.message, sources: response.sources };
            setMessages(prev => [...prev, modelMessage]);
        } catch (err: any) {
            const errorMessage: Message = { role: 'model', text: `Désolé, une erreur est survenue: ${err.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    return (
        <div className="flex flex-col max-h-[600px] bg-white rounded-lg shadow-lg border border-slate-200/80">
            <div className="flex items-center p-4 border-b border-slate-200/80 bg-slate-50 rounded-t-lg">
                <img src="/assets/favicon.png" alt="PharmIA Logo" className="h-6 w-6 mr-3" />
                <h3 className="text-lg font-bold text-slate-800">Assistant PharmIA</h3>
            </div>

            <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <img src="/assets/favicon.png" alt="PharmIA" className="w-8 h-8 rounded-full" />}
                        <div
                            className={`relative group max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                                msg.role === 'user' 
                                ? 'bg-teal-600 text-white rounded-br-none' 
                                : 'bg-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                        >
                            <p 
                                className="text-sm whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: renderChatMessage(msg.text) }}
                            />
                            {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-300">
                                    <h5 className="text-xs font-bold text-slate-500 mb-1">Sources:</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.sources.map((source: any) => (
                                            <Link 
                                                to={`/memofiche/${source.objectID}`} 
                                                key={source.objectID}
                                                className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md hover:bg-teal-100 hover:text-teal-700 transition-colors"
                                            >
                                                {source.title}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <img src="/assets/favicon.png" alt="PharmIA" className="w-8 h-8 rounded-full" />
                        <div className="px-4 py-2 rounded-2xl bg-slate-200 text-slate-800 rounded-bl-none">
                            <Spinner className="h-5 w-5 text-slate-500" />
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-200/80 bg-slate-50 rounded-b-lg">
                <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Posez votre question ici..."
                            className="w-full pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            disabled={isLoading}
                            aria-label="Votre question"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="rounded-full disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                        aria-label="Envoyer"
                    >
                        <img src="https://pharmaconseilbmb.com/photos/site/bot.gif" alt="Envoyer" className="h-12 w-12" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomChatBot;