import React, { useState, useEffect } from 'react';
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
    const [selectedMenu, setSelectedMenu] = useState('parcours');

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

    const renderPharmacienDashboard = () => {
        const { team, getPharmacistTeam } = useData();

        useEffect(() => {
            if (selectedMenu === 'equipe' && user?._id) {
                getPharmacistTeam(user._id);
            }
        }, [selectedMenu, user?._id, getPharmacistTeam]);

        return (
            <div>
                <div className="flex justify-center mb-8">
                    <button 
                        className={`px-4 py-2 font-semibold rounded-l-lg ${selectedMenu === 'parcours' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                        onClick={() => setSelectedMenu('parcours')}
                    >
                        Parcours d'apprentissage
                    </button>
                    <button 
                        className={`px-4 py-2 font-semibold rounded-r-lg ${selectedMenu === 'equipe' ? 'bg-teal-600 text-white' : 'bg-white text-teal-600'}`}
                        onClick={() => setSelectedMenu('equipe')}
                    >
                        Gestion de l'équipe
                    </button>
                </div>

                {selectedMenu === 'parcours' && renderLearnerDashboard()}
                {selectedMenu === 'equipe' && (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {team.map(preparateur => (
                                <div key={preparateur._id} className="bg-white rounded-xl shadow-lg p-6 text-center">
                                    <h3 className="text-xl font-bold text-teal-600">{preparateur.firstName} {preparateur.lastName}</h3>
                                    <div className="mt-4">
                                        <p>Mémofiches lues: {preparateur.readFicheIds?.length || 0}</p>
                                        <p>Quiz réalisés: {preparateur.quizHistory?.length || 0}</p>
                                        <p>Score moyen: {preparateur.quizHistory && preparateur.quizHistory.length > 0 ? Math.round(preparateur.quizHistory.reduce((acc, quiz) => acc + (quiz.score || 0), 0) / preparateur.quizHistory.length) : 0}%</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8">
                            <h2 className="text-2xl font-bold text-teal-600 mb-4">Consigne du Pharmacien à l'équipe</h2>
                            <textarea
                                rows={4}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-base"
                                placeholder="Écrivez vos consignes ici..."
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderLearnerDashboard = () => (
        <>
            {/* --- Stats Section --- */}
            <div>
                <h2 className="text-2xl font-bold text-teal-600 mb-4">Statistiques d'apprentissage</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Bloc 1: Mémofiches lues */}
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold text-teal-600 my-2 animated-gradient-text">
                            {memofichesLues}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Mémofiches lues</h1>
                    </div>

                    {/* Bloc 2: Quiz réalisés */}
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {quizRealises}
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Quiz réalisés</h1>
                    </div>

                    {/* Bloc 3: Score moyen */}
                    <div className="bg-white rounded-xl shadow-lg p-6 text-center flex flex-col justify-center items-center transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                        <p className="text-6xl font-bold my-2" style={{color: '#0D9488'}}>
                            {averageScore}%
                        </p>
                        <h1 className="text-lg text-slate-600 font-medium">Score moyen</h1>
                    </div>
                </div>
            </div>

            {/* Bloc 4: Encouragement et CTA */}
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

            {/* --- Latest MemoFiches Preview --- */}
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

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {user?.role === UserRole.PHARMACIEN ? renderPharmacienDashboard() : renderLearnerDashboard()}
        </div>
    );
};

export default Dashboard;
