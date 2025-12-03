import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import AlgoliaSearch from '../components/AlgoliaSearch';
import { BookOpenIcon, VideoCameraIcon } from '../components/Icons';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]"> {/* Adjust height based on header height */}
            <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800">
                    Bonjour, {user?.firstName || 'cher utilisateur'} !
                </h1>
                <p className="mt-4 text-lg text-slate-600 max-w-2xl">
                    Que souhaitez-vous apprendre aujourd'hui ?
                </p>
                
                {/* Algolia Search Component takes the central stage */}
                <AlgoliaSearch />

            </main>

            <footer className="w-full py-8">
                <div className="flex justify-center items-center gap-6">
                    <Link 
                        to="/memofiches"
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md w-48 h-36 text-slate-700 hover:text-teal-600 hover:shadow-xl transition-all duration-300"
                    >
                        <BookOpenIcon className="h-12 w-12" />
                        <span className="mt-2 font-bold text-lg">Mémofiches</span>
                    </Link>
                    <Link 
                        to="/webinars"
                        className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md w-48 h-36 text-slate-700 hover:text-teal-600 hover:shadow-xl transition-all duration-300"
                    >
                        <VideoCameraIcon className="h-12 w-12" />
                        <span className="mt-2 font-bold text-lg">Wébinaires</span>
                    </Link>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;