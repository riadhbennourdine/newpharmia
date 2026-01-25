import React from 'react';
import LearnerDashboard from '../components/LearnerDashboard';

const LearningJourneyPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-8">
        Mon Parcours d'Apprentissage
      </h1>
      <LearnerDashboard />
    </div>
  );
};

export default LearningJourneyPage;
