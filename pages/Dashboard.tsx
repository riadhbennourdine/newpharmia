import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import AlgoliaSearch from '../components/AlgoliaSearch';
import CustomChatBot from '../components/CustomChatBot';
import { BookOpenIcon, VideoCameraIcon, UserGroupIcon, AcademicCapIcon } from '../components/Icons';

import { UserRole } from '../types';

const Dashboard: React.FC = () => {
    const { user } = useAuth();



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

                <div className="mt-8 w-full max-w-2xl">
                    <CustomChatBot context="" title="Informations générales PharmIA" />
                </div>

            </main>

            <footer className="w-full py-8">
                <div className="flex justify-center items-center flex-wrap gap-4">
                    <Link 
                        to="/memofiches"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-36 h-28 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <img src="/api/ftp/view?filePath=%2Fpharmia%2Ficons%2Fmemofiche.png" alt="Mémofiches Icon" className="h-8 w-8" />
                        <span className="mt-2 font-bold text-sm">Mémofiches</span>
                    </Link>
                    <Link 
                        to="/webinars"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-36 h-28 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <img src="/api/ftp/view?filePath=%2Fpharmia%2Ficons%2Fwebinar.png" alt="Wébinaires Icon" className="h-8 w-8" />
                        <span className="mt-2 font-bold text-sm">Wébinaires</span>
                    </Link>
                    <Link 
                        to="/my-dashboard"
                        className="flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm w-36 h-28 text-slate-600 hover:text-teal-600 hover:shadow-md transition-all duration-300"
                    >
                        <img src="/api/ftp/view?filePath=%2Fpharmia%2Ficons%2Fteam.png" alt="Gestion Équipe Icon" className="h-8 w-8" />
                        <span className="mt-2 font-bold text-sm whitespace-nowrap">Gestion Équipe</span>
                    </Link>
                </div>
            </footer>
        </div>
    );
};

export default Dashboard;
