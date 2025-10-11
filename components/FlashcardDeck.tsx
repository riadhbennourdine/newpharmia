import React, { useState, useEffect, useCallback } from 'react';
import { Flashcard } from '../types';
import { ArrowLeftCircleIcon, ArrowRightCircleIcon, ArrowUturnLeftIcon } from './Icons';

const FlashcardDeck: React.FC<{ flashcards: Flashcard[] }> = ({ flashcards }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = useCallback(() => {
        setIsFlipped(false);
        setCurrentIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
    }, [flashcards.length]);

    const handlePrev = useCallback(() => {
        setIsFlipped(false);
        setCurrentIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
    }, [flashcards.length]);

    // Keyboard navigation effect for arrows
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // Ignore key events if user is typing in an input
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
                return;
            }

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleNext, handlePrev]);

    const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        // Allow flipping with Space or Enter when the card is focused
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            setIsFlipped(prev => !prev);
        }
    };

    if (!flashcards || flashcards.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
                <p className="text-slate-500">Aucune flashcard disponible pour cette mémofiche.</p>
            </div>
        );
    }
    
    const currentCard = flashcards[currentIndex];

    return (
        <div className="w-full max-w-xl mx-auto p-4">
            <div 
                className={`flashcard-container w-full h-80 cursor-pointer mb-4 ${isFlipped ? 'flipped' : ''}`} 
                onClick={() => setIsFlipped(!isFlipped)}
                onKeyDown={handleCardKeyDown}
                role="button"
                tabIndex={0}
                aria-label={`Flashcard ${currentIndex + 1} sur ${flashcards.length}. Question: ${currentCard.question}.`}
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
                    onClick={handlePrev}
                    className="p-2 text-slate-500 hover:text-teal-600 disabled:opacity-50 transition-colors"
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
                        Carte {currentIndex + 1} / {flashcards.length}
                    </p>
                </div>

                <button 
                    onClick={handleNext}
                    className="p-2 text-slate-500 hover:text-teal-600 disabled:opacity-50 transition-colors"
                    aria-label="Carte suivante (Flèche droite)"
                >
                    <ArrowRightCircleIcon className="h-10 w-10" />
                </button>
            </div>
        </div>
    );
};

export default FlashcardDeck;