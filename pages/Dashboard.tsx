import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import AlgoliaSearch from '../components/AlgoliaSearch';
import { BookOpenIcon, VideoCameraIcon, UserGroupIcon, BrainCircuitIcon } from '../components/Icons';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    const renderRoleSpecificButtons = () => {
        if (!user) return null;

        return (
            <>
                {/* For everyone */}
                <Link 
                    to="/my-dashboard"
                    className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-40 h-32 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                >
                    <BrainCircuitIcon className="h-10 w-10" />
                    <span className="mt-2 font-bold text-md text-center">Gestion d'apprentissage</span>
                </Link>

                {/* For PHARMACIEN only */}
                {user.role === UserRole.PHARMACIEN && (
                    <Link 
                        to="/my-dashboard"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-40 h-32 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <UserGroupIcon className="h-10 w-10" />
                        <span className="mt-2 font-bold text-md text-center">Gestion de l'équipe</span>
                    </Link>
                )}
            </>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]"> {/* Adjust height based on header height */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
                    Bonjour, <span className="text-teal-600">{user?.firstName || 'cher utilisateur'}</span> !
                </h1>
                <p className="mt-4 text-lg text-slate-600 max-w-2xl">
                    Que souhaitez-vous apprendre aujourd'hui ?
                </p>
                
                <AlgoliaSearch />

            </main>

            <footer className="w-full py-8">
                <div className="flex justify-center items-center flex-wrap gap-4">
                    <Link 
                        to="/memofiches"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-40 h-32 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <BookOpenIcon className="h-10 w-10" />
                        <span className="mt-2 font-bold text-md">Mémofiches</span>
                    </Link>
                    <Link 
                        to="/webinars"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-40 h-32 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <VideoCameraIcon className="h-10 w-10" />
                        <span className="mt-2 font-bold text-md">Wébinaires</span>
                    </Link>
                    {renderRoleSpecificButtons()}
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
