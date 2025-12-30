import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SparklesIcon } from './Icons';
import { UserRole } from '../types';

const PlayIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
    </svg>
);

const TeamBriefingPlayer: React.FC = () => {
    const { token, user } = useAuth();
    const [script, setScript] = useState<string | null>(null);
    const [isScriptToday, setIsScriptToday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Initial Fetch
    useEffect(() => {
        const fetchExistingBriefing = async () => {
            if (!token) return;
            try {
                const response = await fetch('/api/briefing', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.script) {
                    setScript(data.script);
                    setIsScriptToday(data.isToday);
                }
            } catch (error) {
                console.error("Error fetching briefing:", error);
            }
        };
        fetchExistingBriefing();
    }, [token]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            synthRef.current = window.speechSynthesis;
        }
        return () => {
            if (synthRef.current) synthRef.current.cancel();
        };
    }, []);

    const generateBriefing = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/briefing/generate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            
            if (data.script) {
                // If it already exists (same day), simulate generation delay for UX "magic" effect
                if (data.alreadyExists) {
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }
                setScript(data.script);
                setIsScriptToday(true);
            }
        } catch (error) {
            console.error("Failed to generate briefing", error);
        } finally {
            setIsLoading(false);
        }
    };

    const togglePlay = () => {
        if (!synthRef.current || !script) return;

        if (isPlaying) {
            synthRef.current.pause();
            setIsPlaying(false);
        } else {
            if (synthRef.current.paused && utteranceRef.current) {
                synthRef.current.resume();
            } else {
                synthRef.current.cancel(); // Stop any current speech
                const utterance = new SpeechSynthesisUtterance(script);
                utterance.lang = 'fr-FR';
                utterance.rate = 1.05; 
                utterance.pitch = 1.05; 
                
                const voices = synthRef.current.getVoices();
                const frenchVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('fr')) 
                                 || voices.find(v => v.name.includes('Thomas') && v.lang.includes('fr'))
                                 || voices.find(v => v.lang.includes('fr'));
                
                if (frenchVoice) utterance.voice = frenchVoice;

                utterance.onend = () => setIsPlaying(false);
                utteranceRef.current = utterance;
                synthRef.current.speak(utterance);
            }
            setIsPlaying(true);
        }
    };

    const canGenerate = user?.role === UserRole.PHARMACIEN || user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR;

    return (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Flash Info</span>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                             Briefing PharmIA 🎙️
                        </h2>
                    </div>
                    <p className="text-indigo-100 text-sm max-w-lg">
                        {!script 
                            ? "Générez le briefing quotidien : consigne, actus et motivation."
                            : isScriptToday 
                                ? "Le briefing de votre équipe est prêt pour aujourd'hui !"
                                : "Un ancien briefing est disponible. Votre pharmacien peut le mettre à jour."}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Only show Generate button if no script OR if script is old AND user can generate */}
                    {(!script || (!isScriptToday && canGenerate)) && (
                        <button 
                            onClick={generateBriefing}
                            disabled={isLoading}
                            className={`group flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${script ? 'bg-indigo-400 text-white' : 'bg-white text-indigo-600'}`}
                        >
                            {isLoading ? (
                                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : (
                                <SparklesIcon className="h-5 w-5" />
                            )}
                            {isLoading ? "Préparation..." : script ? "Mettre à jour" : "Générer"}
                        </button>
                    )}

                    {script && (
                        <div className="flex items-center gap-4 bg-black/20 p-2 pr-6 rounded-full backdrop-blur-sm animate-fadeIn">
                            <button 
                                onClick={togglePlay}
                                className="w-12 h-12 flex items-center justify-center bg-white text-indigo-600 rounded-full shadow-md hover:scale-110 transition-transform"
                            >
                                {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 ml-1" />}
                            </button>
                            
                            <div className="flex flex-col">
                                <span className="text-xs font-medium opacity-70 uppercase">{isScriptToday ? "Aujourd'hui" : "Ancien"}</span>
                                <div className="flex items-center gap-1 h-4">
                                    {isPlaying ? (
                                        [...Array(5)].map((_, i) => (
                                            <div key={i} className="w-1 bg-white rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                                        ))
                                    ) : (
                                        <span className="text-sm font-bold">Écouter</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {script && (
                <div className="mt-6 pt-4 border-t border-white/10">
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-indigo-200 hover:text-white flex items-center gap-1"
                    >
                        {isExpanded ? "Masquer le texte" : "Lire le texte"}
                    </button>
                    {isExpanded && (
                        <div className="mt-3 p-4 bg-black/20 rounded-lg text-sm leading-relaxed text-indigo-50 font-mono whitespace-pre-wrap animate-fadeIn">
                            {script}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamBriefingPlayer;