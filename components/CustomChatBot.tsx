import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/geminiService';
import { BrainCircuitIcon, Spinner } from './Icons';

interface Message {
    role: 'user' | 'model';
    text: string;
}

const CustomChatBot: React.FC<{ context: string, title: string }> = ({ context, title }) => {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'model',
            text: `Bonjour! Je suis votre assistant PharmIA. Je suis là pour répondre à vos questions sur :\n\n**${title}**\n\nComment puis-je vous aider aujourd\'hui ?`
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    const renderChatMessage = (text: string) => {
        // Replace **keyword** with a styled strong tag
        const html = text.replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold text-teal-600">$1</strong>`);
        return html;
    };

    useEffect(() => {
        // Auto-scroll to the latest message
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading) return;

        const newUserMessage: Message = { role: 'user', text: trimmedInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await sendChatMessage(newMessages, context);
            const modelMessage: Message = { role: 'model', text: response.message };
            setMessages(prevMessages => [...prevMessages, modelMessage]);
        } catch (err: any) {
            const errorMessage: Message = { role: 'model', text: `Désolé, une erreur est survenue: ${err.message}` };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[70vh] max-h-[600px] bg-white rounded-lg shadow-lg border border-slate-200/80">
            <div className="flex items-center p-4 border-b border-slate-200/80 bg-slate-50 rounded-t-lg">
                <img src="/assets/logo-pharmia.png" alt="PharmIA Logo" className="h-6 w-6 mr-3" />
                <h3 className="text-lg font-bold text-slate-800">Assistant PharmIA</h3>
            </div>

            <div ref={chatContainerRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <img src="/assets/logo-pharmia.png" alt="PharmIA" className="w-8 h-8 rounded-full" />}
                        <div
                            className={`max-w-xs md:max-w-md px-4 py-2 rounded-2xl ${
                                msg.role === 'user' 
                                ? 'bg-teal-600 text-white rounded-br-none' 
                                : 'bg-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                        >
                            <p 
                                className="text-sm whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: renderChatMessage(msg.text) }}
                            />
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">IA</div>
                        <div className="px-4 py-2 rounded-2xl bg-slate-200 text-slate-800 rounded-bl-none">
                            <Spinner className="h-5 w-5 text-slate-500" />
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/80 bg-slate-50 rounded-b-lg">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Posez votre question ici..."
                        className="flex-grow w-full px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        disabled={isLoading}
                        aria-label="Votre question"
                    />
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