import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SparklesIcon, CalendarIcon } from './Icons';
import { UserRole } from '../types';
import { Link } from 'react-router-dom';

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
    const [actions, setActions] = useState<{ label: string; url: string; }[]>([]);
    const [instruction, setInstruction] = useState<string | null>(null);
    const [isScriptToday, setIsScriptToday] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Initial Fetch
    useEffect(() => {
        const fetchExistingBriefing = async () => {
            if (!token) return;
            try {
                const response = await fetch('/api/briefing', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                if (data.script || data.instruction) {
                    setScript(data.script || null);
                    setActions(data.actions || []);
                    setInstruction(data.instruction || null);
                    setIsScriptToday(data.isToday);
                    if (data.language) setLanguage(data.language);
                    if (data.audioUrl) setAudioUrl(data.audioUrl);
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
            audioRef.current = new Audio();
        }
        return () => {
            if (synthRef.current) synthRef.current.cancel();
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    const generateBriefing = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        // Stop any current playback
        if (audioRef.current) audioRef.current.pause();
        if (synthRef.current) synthRef.current.cancel();
        setIsPlaying(false);

        try {
            const response = await fetch('/api/briefing/generate', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ language })
            });
            const data = await response.json();
            
            if (data.script) {
                setScript(data.script);
                setActions(data.actions || []);
                setIsScriptToday(true);
                setAudioUrl(data.audioUrl || null);
            }
        } catch (error) {
            console.error("Failed to generate briefing", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // ... existing togglePlay and cleanup code remains same ...

    const togglePlay = () => {
        if (!script) return;
        setErrorMessage(null);

        // Priority 1: Server-Side Audio (MP3)
        if (audioUrl && audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                // If source not set or changed
                if (!audioRef.current.src || !audioRef.current.src.endsWith(audioUrl)) {
                    audioRef.current.src = audioUrl;
                }
                
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => {
                        console.error("Audio playback error:", e);
                        setErrorMessage("Erreur lors de la lecture du fichier audio.");
                        setIsPlaying(false);
                    });
                
                audioRef.current.onended = () => setIsPlaying(false);
                audioRef.current.onpause = () => setIsPlaying(false);
            }
            return;
        }

        // Priority 2: Browser TTS (Fallback)
        if (!synthRef.current) {
             synthRef.current = window.speechSynthesis;
        }

        if (isPlaying) {
            // User wants to PAUSE
            synthRef.current.pause();
            // Clear keep-alive interval immediately
            if (intervalRef.current) clearInterval(intervalRef.current);
            setIsPlaying(false);
        } else {
            // User wants to PLAY (or RESUME)
            if (synthRef.current.paused && synthRef.current.speaking) {
                // Resume logic
                synthRef.current.resume();
                setIsPlaying(true);
                
                // Restart keep-alive
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    if (synthRef.current?.speaking && !synthRef.current?.paused) {
                        synthRef.current.pause();
                        synthRef.current.resume();
                    }
                }, 10000);

            } else {
                // Start new speech
                synthRef.current.cancel(); 
                
                const utterance = new SpeechSynthesisUtterance(script);
                utterance.rate = 1.0; 
                utterance.pitch = 1.0;
                
                const voices = synthRef.current.getVoices();
                let bestVoice = null;

                if (language === 'ar') {
                    // Try to find an Arabic voice
                    bestVoice = voices.find(v => v.lang.includes('ar') || v.lang.includes('AR'));
                    utterance.lang = bestVoice ? bestVoice.lang : 'ar-SA';
                    console.log("Selected Arabic Voice:", bestVoice?.name || "Default (ar-SA)");
                } else {
                    utterance.lang = 'fr-FR';
                    bestVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('fr')) 
                                   || voices.find(v => v.name.includes('Thomas') && v.lang.includes('fr'))
                                   || voices.find(v => v.lang.includes('fr'));
                }
                
                if (bestVoice) utterance.voice = bestVoice;

                utterance.onend = () => {
                    setIsPlaying(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                };
                
                utterance.onpause = () => setIsPlaying(false);
                utterance.onresume = () => setIsPlaying(true);
                
                utterance.onerror = (e) => {
                    console.error("Speech error:", e);
                    setIsPlaying(false);
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    
                    if (language === 'ar') {
                         setErrorMessage("Impossible de lire l'audio : Aucune voix arabe détectée sur cet appareil.");
                    } else {
                         setErrorMessage("Erreur de lecture audio.");
                    }
                };

                utteranceRef.current = utterance;
                synthRef.current.speak(utterance);
                setIsPlaying(true);
                
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                    if (synthRef.current?.speaking && !synthRef.current?.paused) {
                        synthRef.current.pause();
                        synthRef.current.resume();
                    }
                }, 10000);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel();
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, []);

    // Load voices
    useEffect(() => {
        const loadVoices = () => {
            if (typeof window !== 'undefined') {
                 window.speechSynthesis.getVoices();
            }
        };
        loadVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const canGenerate = user?.role === UserRole.PHARMACIEN || user?.role === UserRole.ADMIN || user?.role === UserRole.ADMIN_WEBINAR;

    return (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 relative overflow-hidden border-l-4 border-teal-500">
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                
                <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">Flash Info</span>
                        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                             Briefing PharmIA 🎙️
                        </h2>
                    </div>
                    <p className="text-slate-500 text-sm max-w-lg">
                        {!script 
                            ? (user?.role === UserRole.PREPARATEUR 
                                ? "Écoutez le briefing quotidien : consigne, actus et motivation." 
                                : "Générez le briefing quotidien : consigne, actus et motivation.")
                            : isScriptToday 
                                ? "Le briefing de votre équipe est prêt pour aujourd'hui !"
                                : "Un ancien briefing est disponible. Votre pharmacien peut le mettre à jour."}
                    </p>

                    {instruction && (
                        <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-lg">
                            <p className="text-xs font-bold text-teal-800 uppercase tracking-tight mb-1">Consigne du Titulaire :</p>
                            <p className="text-sm text-teal-700 font-medium italic">"{instruction}"</p>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-end gap-3">
                    {canGenerate && (
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button 
                                onClick={() => setLanguage('fr')} 
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'fr' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                🇫🇷 FR
                            </button>
                            <button 
                                onClick={() => setLanguage('ar')} 
                                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${language === 'ar' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                🇹🇳 TN
                            </button>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        {/* Always show Generate/Update button for authorized users */}
                        {canGenerate && (
                            <button 
                                onClick={generateBriefing}
                                disabled={isLoading}
                                className={`group flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${script ? 'bg-teal-500 text-white' : 'bg-white text-teal-600 border border-teal-200'}`}
                            >
                                {isLoading ? (
                                    <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"></span>
                                ) : (
                                    <SparklesIcon className="h-5 w-5" />
                                )}
                                {isLoading ? "Préparation..." : (script && isScriptToday) ? "Régénérer" : script ? "Mettre à jour" : "Générer"}
                            </button>
                        )}

                        {script && (
                            <div className="flex items-center gap-4 bg-slate-100 p-2 pr-6 rounded-full animate-fadeIn">
                                <button 
                                    onClick={togglePlay}
                                    className="w-12 h-12 flex items-center justify-center bg-teal-600 text-white rounded-full shadow-md hover:scale-110 transition-transform"
                                >
                                    {isPlaying ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6 ml-1" />}
                                </button>
                                
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium text-slate-500 uppercase">{isScriptToday ? "Aujourd'hui" : "Ancien"}</span>
                                    <div className="flex items-center gap-1 h-4">
                                        {isPlaying ? (
                                            [...Array(5)].map((_, i) => (
                                                <div key={i} className="w-1 bg-teal-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                                            ))
                                        ) : (
                                            <span className="text-sm font-bold text-slate-700">Écouter</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errorMessage}
                </div>
            )}

            {/* Script and Actions Section */}
            {script && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                     <div className="flex flex-wrap items-center gap-4 justify-between">
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
                        >
                            {isExpanded ? "Masquer le texte" : "Lire le texte"}
                        </button>
                        
                        {/* Action Buttons */}
                        {actions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {actions.map((action, idx) => (
                                    <Link 
                                        key={idx} 
                                        to={action.url}
                                        className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-full hover:bg-teal-100 transition-colors flex items-center gap-1"
                                    >
                                        {action.label} 
                                        <CalendarIcon className="h-4 w-4 ml-1" />
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {isExpanded && (
                        <div className="mt-3 p-4 bg-slate-50 border border-slate-100 rounded-lg text-sm leading-relaxed text-slate-700 font-mono whitespace-pre-wrap animate-fadeIn">
                            {script}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeamBriefingPlayer;