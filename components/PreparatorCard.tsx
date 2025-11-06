import React from 'react';
import { User } from '../types';

interface Props {
    preparator: User;
}

const PreparatorCard: React.FC<Props> = ({ preparator }) => {
    const memofichesLues = preparator.readFicheIds?.length || 0;
    const quizHistory = preparator.quizHistory || [];
    const quizRealises = quizHistory.length;
    const averageScore = quizRealises > 0
        ? Math.round(quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) / quizRealises)
        : 0;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
            <h3 className="text-xl font-bold text-teal-600 mb-4">{preparator.firstName} {preparator.lastName}</h3>
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col justify-center items-center relative">
                    <p className="text-4xl font-bold text-teal-600">{memofichesLues}</p>
                    <p className="text-sm text-slate-600">Mémofiches lues</p>
                    {preparator._id && (
                        <Link to={`/read-fiches/${preparator._id}`} className="absolute top-0 right-0 text-teal-600 hover:text-teal-800">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </Link>
                    )}
                </div>
                <div className="flex flex-col justify-center items-center relative">
                    <p className="text-4xl font-bold text-teal-600">{quizRealises}</p>
                    <p className="text-sm text-slate-600">Quiz réalisés</p>
                    {preparator._id && (
                        <Link to={`/quiz-history/${preparator._id}`} className="absolute top-0 right-0 text-teal-600 hover:text-teal-800">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                        </Link>
                    )}
                </div>
                <div className="flex flex-col justify-center items-center">
                    <p className="text-4xl font-bold text-teal-600">{averageScore}%</p>
                    <p className="text-sm text-slate-600">Score moyen</p>
                </div>
            </div>
        </div>
    );
};

export default PreparatorCard;
