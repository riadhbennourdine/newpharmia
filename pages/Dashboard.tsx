import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import AlgoliaSearch from '../components/AlgoliaSearch';
import { BookOpenIcon, VideoCameraIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-white p-4">
            <main className="w-full max-w-3xl mx-auto flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
                    Bonjour, <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">{user?.firstName || 'cher utilisateur'}</span> !
                </h1>
                <p className="mt-4 text-lg text-slate-300 max-w-2xl">
                    Que souhaitez-vous apprendre aujourd'hui ?
                </p>

                <AlgoliaSearch />

                <div className="mt-8 flex items-center justify-center space-x-6">
                    <Link to="/memofiches" className="flex items-center text-slate-300 hover:text-white transition-colors duration-300">
                        <BookOpenIcon className="h-5 w-5 mr-2" />
                        <span className="font-medium">Mémofiches</span>
                    </Link>
                    <Link to="/webinars" className="flex items-center text-slate-300 hover:text-white transition-colors duration-300">
                        <VideoCameraIcon className="h-5 w-5 mr-2" />
                        <span className="font-medium">Wébinaires</span>
                    </Link>
                    <Link to="/my-dashboard" className="flex items-center text-slate-300 hover:text-white transition-colors duration-300">
                        <UserGroupIcon className="h-5 w-5 mr-2" />
                        <span className="font-medium">Gestion Équipe</span>
                    </Link>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
