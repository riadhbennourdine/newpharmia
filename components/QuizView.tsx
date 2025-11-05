import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { CheckCircleIcon, XCircleIcon, ChevronLeftIcon } from './Icons';
import { useAuth } from '../hooks/useAuth';

interface QuizViewProps {
  questions: QuizQuestion[];
  caseTitle: string;
  onBack: () => void;
  quizId: string;
}

const QuizView: React.FC<QuizViewProps> = ({ questions, caseTitle, onBack, quizId }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null);
  const { user, saveQuizResult } = useAuth();

  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Quiz non disponible</h2>
        <p className="text-slate-600 mb-6">Il n'y a pas de questions pour ce quiz pour le moment.</p>
        <button onClick={onBack} className="mt-4 bg-teal-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-teal-700 transition-colors">
          Retour
        </button>
      </div>
    );
  }

  const handleAnswerSelect = (optionIndex: number) => {
    console.log('handleAnswerSelect called with optionIndex:', optionIndex);
    if (submittedAnswer !== null) {
        console.log('Answer already submitted, returning.');
        return;
    }
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
    setSubmittedAnswer(optionIndex);
    console.log('submittedAnswer set to:', optionIndex);
  };

  const handleNext = async () => {
    console.log('handleNext called. Current index:', currentQuestionIndex, 'Questions length:', questions.length);
    setSubmittedAnswer(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      console.log('setCurrentQuestionIndex to:', currentQuestionIndex + 1);
    } else {
      console.log('Quiz completed. Showing results.');
      setShowResults(true);
      if (user && quizId) {
        const rawScore = calculateScore();
        const percentageScore = Math.round((rawScore / questions.length) * 100);
        saveQuizResult({ 
          quizId, 
          score: percentageScore, 
          completedAt: new Date() 
        });
      }
    }
  };

  const calculateScore = () => {
    return selectedAnswers.reduce((score, answer, index) => {
      return answer === questions[index].correctAnswerIndex ? score + 1 : score;
    }, 0);
  };

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    const getAppreciation = () => {
        if (percentage === 100) return { message: "Parfait ! Vous êtes un expert sur ce sujet !", color: "text-green-500" };
        if (percentage >= 80) return { message: "Excellent ! Vous maîtrisez bien le sujet.", color: "text-green-500" };
        if (percentage >= 50) return { message: "Bon travail ! Continuez à approfondir vos connaissances.", color: "text-amber-500" };
        return { message: "Continuez à réviser, vous êtes sur la bonne voie !", color: "text-red-500" };
    };

    const appreciation = getAppreciation();

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswers(Array(questions.length).fill(null));
        setShowResults(false);
        setSubmittedAnswer(null);
    };

    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
        <div className="text-center border-b pb-8 mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Résultats du Quiz</h2>
            <p className="text-slate-600 mb-6">Pour le cas : "{caseTitle}"</p>
            
            <div className={`mb-4 text-7xl font-extrabold ${appreciation.color}`}>
                {percentage}%
            </div>
            <p className={`text-xl font-semibold ${appreciation.color} mb-4`}>{appreciation.message}</p>
            
            <p className="text-lg text-slate-700 mb-6">Vous avez répondu correctement à {score} question(s) sur {questions.length}.</p>
            
            <p className="text-md text-slate-500 mb-8 max-w-md mx-auto">
                Chaque erreur est une opportunité d'apprendre. N'hésitez pas à revoir la mémofiche pour renforcer vos connaissances.
            </p>

            <div className="flex justify-center space-x-4">
                <button onClick={handleRestart} className="px-6 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors">
                    Recommencer le Quiz
                </button>
                <button onClick={onBack} className="px-6 py-3 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 transition-colors">
                    Retour à l'étude de cas
                </button>
            </div>
        </div>
        
        <div className="text-left space-y-4">
            <h3 className="text-xl font-bold text-slate-800 text-center mb-4">Réponses détaillées</h3>
            {questions.map((q, index) => {
                const userAnswerIndex = selectedAnswers[index];
                const isCorrect = userAnswerIndex === q.correctAnswerIndex;
                const userAnswerText = userAnswerIndex !== null ? q.options[userAnswerIndex] : 'Pas de réponse';

                return (
                    <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                        <div className="p-4">
                            <p className="font-semibold text-slate-800">{index + 1}. {q.question}</p>
                        </div>
                        <div className="p-4 bg-slate-50/50 border-t border-slate-200/80 space-y-3">
                            <div className={`flex items-start ${isCorrect ? 'text-slate-700' : 'text-red-700'}`}>
                                {isCorrect ? 
                                    <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0 text-green-600" /> : 
                                    <XCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                }
                                <div>
                                    <span className="font-medium">Votre réponse : </span>
                                    <span className={`${isCorrect ? '' : 'line-through'}`}>{userAnswerText}</span>
                                </div>
                            </div>
                            {!isCorrect && (
                                <div className="flex items-start text-green-700">
                                    <CheckCircleIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <span className="font-medium">Bonne réponse : </span>
                                        <span>{q.options[q.correctAnswerIndex]}</span>
                                    </div>
                                </div>
                            )}
                            <div className="mt-2 pt-3 border-t border-slate-200/80">
                                <p className="text-sm text-slate-600"><strong className="text-slate-800">Explication :</strong> {q.explanation}</p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  console.log('QuizView Render. currentQuestionIndex:', currentQuestionIndex, 'questions.length:', questions.length, 'submittedAnswer:', submittedAnswer);

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-lg animate-fade-in">
      <button onClick={onBack} className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 mb-4 transition-colors">
        <ChevronLeftIcon className="h-4 w-4 mr-2" />
        Retour à l'étude de cas
      </button>
      <div className="mb-6">
        <p className="text-sm text-slate-500">Question {currentQuestionIndex + 1} sur {questions.length}</p>
        <h2 className="text-2xl font-bold text-slate-800 mt-1">{currentQuestion.question}</h2>
      </div>
      <div className="space-y-4 mb-8">
        {currentQuestion.options.map((option, index) => {
          const isCorrect = index === currentQuestion.correctAnswerIndex;
          const isSelected = submittedAnswer === index;
          let buttonClass = 'bg-slate-50 hover:bg-teal-100 hover:border-teal-300';

          if (submittedAnswer !== null) {
            if (isCorrect) {
              buttonClass = 'bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500';
            } else if (isSelected) {
              buttonClass = 'bg-red-100 border-red-500 text-red-800 ring-2 ring-red-500';
            } else {
              buttonClass = 'bg-slate-50 border-slate-200 opacity-70 cursor-not-allowed';
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerSelect(index)}
              disabled={submittedAnswer !== null}
              className={`w-full text-left p-4 border rounded-lg transition-all duration-200 flex items-center justify-between ${buttonClass}`}
            >
              <span className="flex-grow">{option}</span>
              {submittedAnswer !== null && isCorrect && <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />}
              {submittedAnswer !== null && isSelected && !isCorrect && <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {submittedAnswer !== null && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg animate-fade-in border border-slate-200">
          <h4 className="font-bold text-slate-800">Explication :</h4>
          <p className="text-slate-700 mt-2">{currentQuestion.explanation}</p>
        </div>
      )}

      <button
        onClick={handleNext}
        disabled={submittedAnswer === null}
        className="w-full mt-8 bg-teal-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {currentQuestionIndex < questions.length - 1 ? 'Question suivante' : 'Terminer & voir les résultats'}
      </button>
    </div>
  );
};

export default QuizView;
