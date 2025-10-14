// Test commit
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Flashcard } from '../types';
import { ArrowLeftCircleIcon, ArrowRightCircleIcon, ArrowUturnLeftIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';

interface FlashcardDeckProps {
    flashcards: Flashcard[];
    memoFicheId: string;
}

const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ flashcards, memoFicheId }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    console.log('memoFicheId:', memoFicheId);

    const deck = useMemo(() => flashcards.slice(0, 10), [flashcards]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setCurrentIndex(prevIndex => {
                    if (prevIndex < deck.length - 1) {
                        setIsFlipped(false);
                        return prevIndex + 1;
                    } else {
                        setIsCompleted(true);
                        return prevIndex;
                    }
                });
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setCurrentIndex(prevIndex => {
                    if (prevIndex > 0) {
                        setIsFlipped(false);
                        return prevIndex - 1;
                    } else {
                        return prevIndex;
                    }
                });
            } else if (e.key === ' ' || e.key === 'Enter') {
                if (document.activeElement?.classList.contains('flashcard-container')) {
                    e.preventDefault();
                    setIsFlipped(prev => !prev);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deck.length]);

    const handleRestart = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setIsCompleted(false);
    };

    if (!deck || deck.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-slate-500">Aucune flashcard disponible pour cette mémofiche.</p>
            </div>
        );
    }

    if (isCompleted) {
        return (
            <div className="w-full max-w-xl mx-auto p-8 text-center bg-white rounded-lg shadow-xl animate-fade-in border-t-4 border-green-500">
                <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto mb-4" />
                <h3 className="text-3xl font-bold text-slate-800 mb-3">Félicitations !</h3>
                <p className="text-lg text-slate-600 mb-8">Vous avez terminé cette série de flashcards. Continuez comme ça !</p>
                <div className="flex justify-center items-center space-x-4">
                    <button
                        onClick={handleRestart}
                        className="flex items-center justify-center px-6 py-3 bg-teal-600 text-white font-bold rounded-lg shadow-md hover:bg-teal-700 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <ArrowPathIcon className="h-6 w-6 mr-2" />
                        Refaire les flashcards
                    </button>
                    <Link
                        to={`/memofiche/${memoFicheId}`}
                        className="flex items-center justify-center px-6 py-3 bg-slate-200 text-slate-800 font-bold rounded-lg shadow-md hover:bg-slate-300 transition-all duration-300"
                    >
                        Retour à la mémofiche
                    </Link>
                </div>
            </div>
        );
    }
    
    const currentCard = deck[currentIndex];

    return (
        <div className="w-full max-w-xl mx-auto p-4">
            <div 
                className={`flashcard-container w-full h-80 cursor-pointer mb-4 ${isFlipped ? 'flipped' : ''}`} 
                onClick={() => setIsFlipped(!isFlipped)}
                role="button"
                tabIndex={0}
                aria-label={`Flashcard ${currentIndex + 1} sur ${deck.length}. Question: ${currentCard.question}.`}
            >
                <div className="flashcard-inner">
                    <div className="flashcard-face flashcard-front" aria-hidden={isFlipped}>
                        <p className="text-2xl font-semibold text-slate-800 text-center">{currentCard.question}</p>
                    </div>
                    <div className="flashcard-face flashcard-back" aria-hidden={!isFlipped}>
                        <p className="text-2xl font-bold text-white text-center">{currentCard.answer}</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <button 
                    onClick={() => {
                        setCurrentIndex(prevIndex => {
                            if (prevIndex > 0) {
                                setIsFlipped(false);
                                return prevIndex - 1;
                            } else {
                                return prevIndex;
                            }
                        });
                    }}
                    disabled={currentIndex === 0}
                    className="p-2 text-slate-500 hover:text-teal-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Carte précédente (Flèche gauche)"
                >
                    <ArrowLeftCircleIcon className="h-10 w-10" />
                </button>
                
                <div className="flex flex-col items-center">
                    <button 
                        onClick={() => setIsFlipped(!isFlipped)}
                        className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                        aria-label="Retourner la carte"
                    >
                        <ArrowUturnLeftIcon className="h-5 w-5 mr-2" />
                        Retourner
                    </button>
                    <p className="text-sm text-slate-500 mt-2" aria-live="polite">
                        Carte {currentIndex + 1} / {deck.length}
                    </p>
                </div>

                <button 
                    onClick={() => {
                        setCurrentIndex(prevIndex => {
                            if (prevIndex < deck.length - 1) {
                                setIsFlipped(false);
                                return prevIndex + 1;
                            } else {
                                setIsCompleted(true);
                                return prevIndex;
                            }
                        });
                    }}
                    className="p-2 text-slate-500 hover:text-teal-600 transition-colors"
                    aria-label="Carte suivante (Flèche droite)"
                >
                    <ArrowRightCircleIcon className="h-10 w-10" />
                </button>
            </div>
        </div>
    );
};

export default FlashcardDeck;
