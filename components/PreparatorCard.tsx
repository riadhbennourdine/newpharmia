import React from 'react';
// import { Link } from 'react-router-dom';
import { User } from '../types';
import { EyeIcon } from './Icons';

interface Props {
  preparator: User;
  onViewJourney?: () => void;
}

const PreparatorCard: React.FC<Props> = ({ preparator, onViewJourney }) => {
  const memofichesLues = preparator.readFiches?.length || 0;
  const quizHistory = preparator.quizHistory || [];
  const quizRealises = quizHistory.length;

  // Calculate average score - Handle the 0-10 vs 0-100 scale if necessary, but here we just take raw average
  // Based on previous fixes, scores might be 0-10.
  const rawAverage =
    quizRealises > 0
      ? quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) /
        quizRealises
      : 0;

  // Formatting logic consistent with other components (if < 10, multiply by 10)
  let displayAverage = Math.round(rawAverage);
  if (displayAverage > 0 && displayAverage <= 10) {
    displayAverage *= 10;
  }

  return (
    <div className="group bg-white rounded-xl shadow-lg p-6 text-center transition-transform duration-300 hover:scale-105 hover:shadow-xl relative">
      {onViewJourney && (
        <button
          onClick={onViewJourney}
          className="absolute top-4 right-4 text-gray-400 hover:text-teal-600 transition-colors p-1"
          title="Voir le parcours détaillé"
        >
          <EyeIcon className="h-6 w-6" />
        </button>
      )}
      <h3 className="text-2xl font-bold text-teal-600 group-hover:text-black">
        {preparator.firstName} {preparator.lastName}
      </h3>
      <div className="border-t border-slate-200 my-4"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col justify-center items-center relative">
          <span className="text-4xl font-bold text-teal-600">
            {memofichesLues}
          </span>
          <p className="text-sm text-slate-600">Mémofiches</p>
        </div>
        <div className="flex flex-col justify-center items-center relative">
          <span className="text-4xl font-bold text-teal-600">
            {quizRealises}
          </span>
          <p className="text-sm text-slate-600">Quiz réalisés</p>
        </div>
        <div className="flex flex-col justify-center items-center">
          <p className="text-4xl font-bold text-teal-600">{displayAverage}%</p>
          <p className="text-sm text-slate-600">Score moyen</p>
        </div>
      </div>

      {onViewJourney && (
        <button
          onClick={onViewJourney}
          className="mt-6 w-full py-2 bg-teal-50 text-teal-700 font-semibold rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
        >
          <EyeIcon className="h-5 w-5" />
          Voir le détail du parcours
        </button>
      )}
    </div>
  );
};

export default PreparatorCard;
