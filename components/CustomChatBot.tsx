import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/geminiService';
import { BrainCircuitIcon, Spinner, MicIcon, MicOffIcon, SpeakerIcon } from './Icons';

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
    const [isRecording, setIsRecording] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const transcriptRef = useRef('');

    const stripMarkdown = (text: string) => {
        // This will remove ** for bold, and * for italic
        return text.replace(/\*{1,2}(.*?)\*{1,2}/g, '$1');
    };

    const speakText = (text: string, lang = 'fr-FR') => {
        if (!window.speechSynthesis) return;

        const cleanText = stripMarkdown(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = lang;
        utterance.rate = 1.3; // A bit faster
        utterance.pitch = 1.2; // A bit higher

        const voices = window.speechSynthesis.getVoices();
        console.log('Available French voices:', voices.filter(v => v.lang === 'fr-FR'));

        const frenchVoice = voices.find(voice => voice.lang === lang && voice.name.includes('Google'));
        if (frenchVoice) {
            utterance.voice = frenchVoice;
        }

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.lang = 'fr-FR';
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onresult = (event: any) => {
                const transcript = event.results[event.results.length - 1][0].transcript;
                transcriptRef.current = transcript.trim();
                setInputValue(transcript.trim());
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (isRecording) {
                    recognitionRef.current.stop();
                }
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
                if (transcriptRef.current) {
                    sendMessage(transcriptRef.current);
                    transcriptRef.current = '';
                }
            };
        } else {
            console.warn("Speech recognition not supported in this browser.");
        }

        // Load voices initially
        window.speechSynthesis?.getVoices();

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            window.speechSynthesis?.cancel();
        };
    }, []);

    const toggleRecording = () => {
        if (!recognitionRef.current) return;

        if (isRecording) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
        setIsRecording(!isRecording);
    };

    const renderChatMessage = (text: string) => {
        const html = text.replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold text-teal-600">$1</strong>`);
        return html;
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
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);
        setError(null);

        try {
            const response = await sendChatMessage(newMessages, context);
            const modelMessage: Message = { role: 'model', text: response.message };
            setMessages(prevMessages => [...prevMessages, modelMessage]);
            speakText(response.message);
        } catch (err: any) {
            const errorMessage: Message = { role: 'model', text: `Désolé, une erreur est survenue: ${err.message}` };
            setMessages(prevMessages => [...prevMessages, errorMessage]);
            speakText(errorMessage.text);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    return (
        <div className="flex flex-col h-[70vh] max-h-[600px] bg-white rounded-lg shadow-lg border border-slate-200/80">
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
                             {msg.role === 'model' && (
                                <button 
                                    onClick={() => speakText(msg.text)}
                                    className="absolute -bottom-2 -right-2 p-1 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    aria-label="Écouter le message"
                                >
                                    <SpeakerIcon className="h-4 w-4" />
                                </button>
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
                        <button
                            type="button"
                            onClick={toggleRecording}
                            className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500 hover:text-teal-600 focus:outline-none"
                            aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Démarrer l\'enregistrement'}
                        >
                            {isRecording ? <SpeakerIcon className="h-5 w-5 text-red-500" /> : <SpeakerIcon className="h-5 w-5" />}
                        </button>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Posez votre question ici..."
                            className="w-full pl-12 pr-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-teal-500 focus:outline-none"
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