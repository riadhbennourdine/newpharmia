import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import AlgoliaSearch from '../components/AlgoliaSearch';
import TeamBriefingPlayer from '../components/TeamBriefingPlayer';
import { BookOpenIcon, VideoCameraIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { UserRole } from '../types';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-slate-50 text-slate-800 p-4">
            <main className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    Bonjour, <span className="text-teal-600">{user?.firstName || 'cher utilisateur'}</span> !
                </h1>
                <p className="mt-4 text-lg text-slate-600 max-w-2xl">
                    Que souhaitez-vous apprendre aujourd'hui ?
                </p>

                <div className="w-full max-w-2xl mt-8 mb-4 text-left">
                    <TeamBriefingPlayer />
                </div>

                <AlgoliaSearch />

                <div className="mt-8 flex items-center justify-center space-x-6">
                    <Link to="/memofiches" className="group flex items-center text-slate-600 hover:text-teal-700 transition-colors duration-300">
                        <BookOpenIcon className="h-5 w-5 mr-2 text-slate-400 group-hover:text-teal-600 transition-colors duration-300" />
                        <span className="font-medium">Mémofiches</span>
                    </Link>
                    <Link to="/webinars" className="group flex items-center text-slate-600 hover:text-teal-700 transition-colors duration-300">
                        <VideoCameraIcon className="h-5 w-5 mr-2 text-slate-400 group-hover:text-teal-600 transition-colors duration-300" />
                        <span className="font-medium">Wébinaires</span>
                    </Link>
                    <Link to="/my-dashboard" className="group flex items-center text-slate-600 hover:text-teal-700 transition-colors duration-300">
                        <UserGroupIcon className="h-5 w-5 mr-2 text-slate-400 group-hover:text-teal-600 transition-colors duration-300" />
                        <span className="font-medium">
                            {user?.role === UserRole.PREPARATEUR ? 'Parcours' : 'Équipe'}
                        </span>
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;