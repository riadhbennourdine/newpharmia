import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CaseStudy, UserRole } from '../types';
import { Spinner, ArrowLeftIcon } from '../components/Icons';
import { isPharmacienOrAdminWebinar } from '../utils/roles';

const ReadFichesPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { user: currentUser } = useAuth();
    const [readFiches, setReadFiches] = useState<(CaseStudy & { readAt: Date; })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('');

    useEffect(() => {
        const fetchReadFiches = async () => {
            if (!userId) {
                setError('User ID is missing.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Fetch user details to get their name
                const userResponse = await fetch(`/api/users/${userId}`);
                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user details.');
                }
                const userData = await userResponse.json();
                setUserName(userData.firstName ? `${userData.firstName} ${userData.lastName}` : userData.email);

                // Fetch the user's read fiches (now with dates)
                const readFichesResponse = await fetch(`/api/users/${userId}/read-fiches`);
                if (!readFichesResponse.ok) {
                    throw new Error('Failed to fetch read fiches.');
                }
                const { readFiches: userReadFiches } = await readFichesResponse.json();

                if (userReadFiches && userReadFiches.length > 0) {
                    // Fetch details for each read fiche
                    const fichesPromises = userReadFiches.map(async (readInfo: { ficheId: string; readAt: Date; }) => {
                        const res = await fetch(`/api/memofiches/${readInfo.ficheId}`);
                        if (res.ok) {
                            const ficheDetails = await res.json();
                            return { ...ficheDetails, readAt: new Date(readInfo.readAt) }; // Combine details with read date
                        }
                        return null;
                    });

                    const fichesDetails = await Promise.all(fichesPromises);
                    setReadFiches(fichesDetails.filter(Boolean) as (CaseStudy & { readAt: Date; })[]); // Filter out any null results
                } else {
                    setReadFiches([]);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReadFiches();
    }, [userId]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spinner className="h-12 w-12 text-teal-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <h2 className="text-2xl font-bold text-red-600 mb-4">Erreur</h2>
                <p className="text-slate-700">{error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <Link to={isPharmacienOrAdminWebinar(currentUser?.role) ? '/dashboard' : '/dashboard'} className="flex items-center text-sm font-medium text-teal-600 hover:text-teal-800 mb-4 transition-colors">
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Retour au tableau de bord
            </Link>
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Mémofiches lues par {userName}</h1>
            
            {readFiches.length === 0 ? (
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-slate-500">Aucune mémofiche lue pour le moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {readFiches.map(fiche => {
                        const quizResult = currentUser?.quizHistory?.find(q => q.quizId === fiche._id);
                        const score = quizResult ? quizResult.score : null;
                        const date = fiche.readAt; // Use the new readAt date

                        return (
                            <div key={fiche._id as string} className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 hover:shadow-xl flex flex-col">
                                <Link to={`/memofiche/${fiche._id}`} className="flex-grow">
                                    <img src={fiche.coverImageUrl || 'https://via.placeholder.com/300x200?text=MemoFiche'} alt={fiche.title} className="w-full h-24 object-cover" />
                                    <div className="p-2">
                                        <h3 className="font-bold text-sm text-slate-800 mb-1 truncate">{fiche.title}</h3>
                                        {date && <p className="text-xs text-slate-500">{date.toLocaleDateString('fr-FR')}</p>}
                                    </div>
                                </Link>
                                <div className="p-2 text-center bg-slate-50">
                                    {score !== null ? (
                                        <p className="text-2xl font-bold text-teal-600">{score}%</p>
                                    ) : (
                                        <p className="text-xs text-slate-400">Quiz non fait</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ReadFichesPage;
