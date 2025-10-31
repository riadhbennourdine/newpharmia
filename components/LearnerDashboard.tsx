import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Spinner, ArrowRightIcon } from './Icons';
import MemoFichePreviewCard from './MemoFichePreviewCard';

interface Props {
    instruction: string;
}

const LearnerDashboard: React.FC<Props> = ({ instruction }) => {
    const { user } = useAuth();
    const { fiches, isLoading } = useData();

    const memofichesLues = user?.readFicheIds?.length || 0;
    const quizHistory = user?.quizHistory || [];
    const quizRealises = quizHistory.length;
    
    const averageScore = quizRealises > 0
        ? Math.round(quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) / quizRealises)
        : 0;

    const encouragementMessages = [
        "Chaque mémofiche lue est un pas de plus vers l'excellence.",
        "La connaissance est votre plus grand atout. Continuez comme ça !",
        "Impressionnant ! Votre dévouement est la clé de votre succès.",
        "Ne lâchez rien, vous êtes sur la bonne voie.",
    ];
    const encouragement = encouragementMessages[Math.floor(Math.random() * encouragementMessages.length)];

    return (
        <>
            {instruction && (
                <div className="bg-white rounded-xl shadow-lg p-6 text-center mb-6 transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                    <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne du Pharmacien</h2>
                    <p className="text-slate-700 font-semibold text-base">{instruction}</p>
                </div>
            )}
            <div>
                <h2 className="text-2xl font-bold text-teal-600 mb-4">Statistiques d'apprentissage</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold text-teal-600 my-2 animated-gradient-text">
                            {memofichesLues}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Mémofiches lues</h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {quizRealises}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Quiz réalisés</h1>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {averageScore}%
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Score moyen</h1>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                <p className="text-teal-700 font-semibold text-base">
                    "{encouragement}"
                </p>
                <Link 
                    to="/memofiches" 
                    className="mt-4 inline-flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-5 rounded-lg shadow-md hover:bg-teal-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    Explorer les mémofiches
                    <ArrowRightIcon className="h-4 w-4" />
                </Link>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-teal-600 mb-6">Dernières mémofiches ajoutées</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center h-40"><Spinner className="h-10 w-10 text-teal-600" /></div>
                ) : fiches.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fiches.map(cs => (
                                <MemoFichePreviewCard key={cs._id} caseStudy={cs} />
                            ))}
                        </div>
                        <div className="text-center mt-8">
                            <Link to="/memofiches" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                                Voir toutes les mémofiches &rarr;
                            </Link>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-10 bg-white rounded-lg shadow-sm">
                        <p className="text-slate-500">Aucune mémofiche à afficher pour le moment.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default LearnerDashboard;