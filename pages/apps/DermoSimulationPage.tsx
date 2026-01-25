import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../hooks/useAuth';
import {
  ArrowLeftIcon,
  Spinner,
  PaperAirplaneIcon,
  SimulationIcon,
  CheckCircleIcon,
} from '../../components/Icons';
import getAbsoluteImageUrl from '../../utils/image';
import { CaseStudy } from '../../types';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const DermoSimulationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getCaseStudyById } = useData();
  const { user } = useAuth();

  const [fiche, setFiche] = useState<CaseStudy | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFicheLoading, setIsFicheLoading] = useState(true);
  const [isEvaluationMode, setIsEvaluationMode] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      getCaseStudyById(id).then((data) => {
        setFiche(data);
        setIsFicheLoading(false);
        // Initial patient greeting
        if (data) {
          const initialGreeting = Array.isArray(data.patientSituation?.content)
            ? data.patientSituation.content.find((c: any) => c.type === 'text')
                ?.value ||
              "Bonjour, je viens vous voir car j'ai quelque chose sur la peau..."
            : "Bonjour, je viens vous voir car j'ai quelque chose sur la peau...";
          setMessages([{ role: 'model', text: initialGreeting }]);
        }
      });
    }
  }, [id, getCaseStudyById]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading || !fiche) return;

    const userMessage = input.trim();
    const newMessages = [
      ...messages,
      { role: 'user', text: userMessage } as Message,
    ];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gemini/dermo-patient', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          history: messages
            .slice(-10)
            .map((m) => ({ role: m.role, text: m.text })),
          fiche: fiche,
        }),
      });

      if (!response.ok) throw new Error('Erreur simulation');
      const data = await response.json();
      setMessages([...newMessages, { role: 'model', text: data.message }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages([
        ...newMessages,
        { role: 'model', text: 'Le patient semble confus... (Erreur service)' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gemini/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          topic: fiche?.title,
          ficheId: fiche?._id,
        }),
      });
      const data = await response.json();
      setEvaluation(data);
      setIsEvaluationMode(true);
    } catch (error) {
      console.error('Evaluation error:', error);
      alert("Impossible de générer l'évaluation pour le moment.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFicheLoading)
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner className="h-12 w-12 text-pink-600" />
      </div>
    );
  if (!fiche)
    return (
      <div className="flex justify-center items-center h-screen">
        Fiche introuvable.
      </div>
    );

  const lesionImage = Array.isArray(fiche.patientSituation?.content)
    ? fiche.patientSituation.content.find((c: any) => c.type === 'image')?.value
    : fiche.coverImageUrl;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-100 font-sans">
      {/* Simulation Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/apps/dermo')}
            className="mr-4 text-slate-400 hover:text-pink-600 transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-tight">
              Cas : {fiche.title}
            </h2>
            <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
              Simulation Interactive
            </p>
          </div>
        </div>
        {!isEvaluationMode && (
          <button
            onClick={handleEvaluate}
            disabled={messages.length < 3 || isLoading}
            className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 transition-all flex items-center shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircleIcon className="h-4 w-4 mr-2" /> Terminer & Évaluer
          </button>
        )}
      </div>

      <div className="flex flex-grow overflow-hidden">
        {/* Left Side: Lesion Image & PHARMA Guide */}
        <div className="hidden md:flex flex-col w-1/3 border-r border-slate-200 bg-white p-6 overflow-y-auto">
          <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">
            Observation Clinique
          </h3>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-slate-100 bg-slate-50 relative group">
            {lesionImage ? (
              <img
                src={getAbsoluteImageUrl(lesionImage)}
                alt="Lésion cutanée"
                className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="p-16 text-center text-slate-300 flex flex-col items-center">
                <span className="text-6xl mb-4">🧴</span>
                <p className="text-sm font-medium italic">
                  Image non disponible pour ce cas.
                </p>
              </div>
            )}
          </div>

          <div className="mt-8 space-y-4">
            <div className="p-5 bg-pink-50 rounded-2xl border border-pink-100">
              <h4 className="text-pink-800 font-bold text-sm mb-3 flex items-center">
                <span className="mr-2">💡</span> Rappel Méthode PHARMA
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'P', t: 'Profil' },
                  { l: 'H', t: 'Histoire' },
                  { l: 'A', t: 'Analyse' },
                  { l: 'R', t: 'Récurrence' },
                  { l: 'M', t: 'Médicaments' },
                  { l: 'A', t: 'Alerte' },
                ].map((item) => (
                  <div key={item.l} className="flex items-center space-x-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-[10px] font-black text-pink-600 shadow-sm">
                      {item.l}
                    </span>
                    <span className="text-[11px] font-bold text-pink-700">
                      {item.t}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed italic text-center px-4">
              Questionnez le patient pour identifier les lésions élémentaires et
              exclure les drapeaux rouges.
            </p>
          </div>
        </div>

        {/* Right Side: Interaction */}
        <div className="flex-grow flex flex-col bg-slate-50 relative">
          {isEvaluationMode ? (
            <div className="flex-grow overflow-y-auto p-6 md:p-10 animate-fade-in bg-white">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center h-24 w-24 rounded-full bg-teal-50 mb-4 ring-8 ring-teal-50 shadow-inner">
                    <span className="text-4xl font-black text-teal-600">
                      <SimulationIcon className="h-12 w-12" />
                    </span>
                  </div>
                  <h3 className="text-3xl font-extrabold text-slate-800">
                    {evaluation?.score}%
                  </h3>
                  <p className="text-slate-500 mt-2 font-medium">
                    Cas : {fiche.title}
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 relative">
                    <span className="absolute -top-3 left-8 bg-teal-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                      Feedback du Coach
                    </span>
                    <p className="text-slate-700 leading-relaxed text-lg italic">
                      "{evaluation?.feedback}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                    <button
                      onClick={() => navigate('/apps/dermo')}
                      className="py-4 px-6 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-900 transition-all shadow-lg text-sm"
                    >
                      Retour au Catalogue
                    </button>
                    <button
                      onClick={() => {
                        setMessages([
                          { role: 'model', text: messages[0].text },
                        ]);
                        setIsEvaluationMode(false);
                        setEvaluation(null);
                      }}
                      className="py-4 px-6 bg-white text-teal-600 border-2 border-teal-600 font-bold rounded-2xl hover:bg-teal-50 transition-all text-sm"
                    >
                      Recommencer le Cas
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Messages */}
              <div
                ref={scrollRef}
                className="flex-grow overflow-y-auto p-6 space-y-6 scroll-smooth"
              >
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                  >
                    <div
                      className={`max-w-[85%] p-4 rounded-2xl shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-pink-600 text-white rounded-tr-none'
                          : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/60'
                      }`}
                    >
                      <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                      <div
                        className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-4px_20px_-2px_rgba(0,0,0,0.05)]">
                <div className="max-w-4xl mx-auto flex items-end space-x-3">
                  <div className="flex-grow relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      rows={1}
                      placeholder="Répondez au patient..."
                      className="w-full px-5 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-pink-500 focus:bg-white transition-all text-slate-800 resize-none max-h-32"
                    />
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className={`p-3.5 rounded-xl transition-all ${
                      isLoading || !input.trim()
                        ? 'bg-slate-200 text-slate-400'
                        : 'bg-pink-600 text-white shadow-lg hover:bg-pink-700 active:scale-95'
                    }`}
                  >
                    <PaperAirplaneIcon className="h-6 w-6 transform rotate-90" />
                  </button>
                </div>
                <div className="text-center mt-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                    Objectif : Appliquer le P.H.A.R.M.A
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DermoSimulationPage;
