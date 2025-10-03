import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { Spinner, BookOpenIcon, CheckCircleIcon, TrendingUpIcon, ArrowRightIcon } from '../components/Icons';
import { CaseStudy, UserRole } from '../types';

// A smaller, more focused card for the dashboard preview
const MemoFichePreviewCard: React.FC<{ caseStudy: CaseStudy }> = ({ caseStudy }) => (
    <Link to={`/memofiche/${caseStudy._id}`} className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden block">
        <div className="relative">
            <img 
                src={caseStudy.coverImageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=800&auto=format&fit=crop'} 
                alt={caseStudy.title} 
                className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
        </div>
        <div className="p-4">
            <h3 className="text-md font-bold text-slate-800 group-hover:text-teal-700 truncate">{caseStudy.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{caseStudy.theme}</p>
        </div>
    </Link>
);


const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const { fiches, isLoading, fetchFiches } = useData();

    // Fetch latest 3 fiches on component mount
    useEffect(() => {
        fetchFiches({ page: 1, limit: 3, sortBy: 'newest' });
    }, [fetchFiches]);

    // Calculate user stats
    const memofichesLues = user?.readFicheIds?.length || 0;
    const quizHistory = user?.quizHistory || [];
    const quizRealises = quizHistory.length;
    
    // Assuming quizHistory is an array of objects like { score: number }
    // where score is a percentage.
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* --- Stats Section --- */}
            <div className="bg-white rounded-xl shadow-lg p-8 mb-12 text-center">
                <p className="text-8xl font-bold text-teal-600 my-4 animated-gradient-text">
                    {memofichesLues}
                </p>
                <h1 className="text-2xl text-slate-600 font-medium">Mémofiches lues</h1>
                
                <div className="flex justify-center items-center gap-8 md:gap-16 text-slate-700 mt-8">
                    <div className="text-center">
                        <CheckCircleIcon className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-4xl font-bold">{quizRealises}</p>
                        <p className="text-sm font-medium text-slate-500">Quiz réalisés</p>
                    </div>
                    <div className="text-center">
                        <TrendingUpIcon className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                        <p className="text-4xl font-bold">{averageScore}%</p>
                        <p className="text-sm font-medium text-slate-500">Score moyen</p>
                    </div>
                </div>
                <p className="text-teal-700 font-semibold text-lg mt-10">
                    "{encouragement}"
                </p>
                <Link 
                    to="/memofiches" 
                    className="mt-8 inline-flex items-center gap-2 bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                    Explorer les mémofiches
                    <ArrowRightIcon className="h-5 w-5" />
                </Link>
            </div>

            {/* --- Latest MemoFiches Preview --- */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-6">Dernières mémofiches ajoutées</h2>
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
        </div>
    );
};

export default Dashboard;
