import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { CaseStudy, UserRole, MemoFicheStatus } from '../types';
import { LockClosedIcon, SparklesIcon, Spinner, PencilIcon, TrashIcon, UserGroupIcon } from '../components/Icons';
import { TOPIC_CATEGORIES } from '../constants';
import AssignFicheToGroupModal from '../components/AssignFicheToGroupModal';

// This is the full-featured card, kept for the main memo fiches page
const MemoFicheCard: React.FC<{ caseStudy: CaseStudy, onAssign: (caseStudy: CaseStudy) => void }> = ({ caseStudy, onAssign }) => {
    const { user } = useAuth();
    const { editCaseStudy, deleteCaseStudy } = useData();
    const navigate = useNavigate();
    
    const canAccess = !caseStudy.isLocked;
    const isAdmin = user?.role === UserRole.ADMIN;
    const isFormateur = user?.role === UserRole.FORMATEUR;

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`Êtes-vous sûr de vouloir supprimer la mémofiche "${caseStudy.title}" ?`)) {
            deleteCaseStudy(caseStudy._id);
        }
    };

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        editCaseStudy(caseStudy._id);
    };

    const handleNavigate = () => {
        if (canAccess) {
            navigate(`/memofiche/${caseStudy._id}`);
        } else {
            navigate('/tarifs');
        }
    };

    return (
        <div className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col">
            <div onClick={handleNavigate} className="cursor-pointer">
                <div className="relative">
                    <img 
                        src={caseStudy.coverImageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop'} 
                        alt={caseStudy.title} 
                        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ objectPosition: caseStudy.coverImagePosition || 'center' }}
                    />
                    {!canAccess && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <LockClosedIcon className="h-10 w-10 text-white" />
                        </div>
                    )}
                </div>
                <div className="p-4 flex-grow flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 group-hover:text-teal-700 truncate">{caseStudy.title}</h3>
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mt-1">{caseStudy.theme} &bull; {caseStudy.system}</p>
                    <p className="text-xs text-slate-500 mt-1">Créé le {new Date(caseStudy.creationDate).toLocaleDateString('fr-FR')}</p>
                    {(isAdmin || isFormateur) && (
                        <p className="text-xs text-slate-500 mt-1">Statut: {caseStudy.status}</p>
                    )}
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2 flex-grow">{caseStudy.shortDescription}</p>
                </div>
            </div>
            
            {(isAdmin || isFormateur) && (
                <div className="mt-auto p-2 border-t border-slate-100 bg-slate-50 flex justify-end items-center gap-2">
                    {(isFormateur || isAdmin) && (
                         <button onClick={handleEdit} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded-full transition-colors">
                            <PencilIcon className="h-5 w-5" />
                        </button>
                    )}
                    {isAdmin && (
                        <>
                            <button onClick={handleDelete} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors">
                                <TrashIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => onAssign(caseStudy)} className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-100 rounded-full transition-colors">
                                <UserGroupIcon className="h-5 w-5" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

const Pagination: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <nav className="flex justify-center mt-8">
            <ul className="inline-flex items-center -space-x-px">
                {pageNumbers.map(number => (
                    <li key={number}>
                        <button
                            onClick={() => onPageChange(number)}
                            className={`px-3 py-2 leading-tight ${currentPage === number ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 hover:bg-gray-100 hover:text-gray-700'} border border-gray-300 transition-colors`}
                        >
                            {number}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

const MemoFichesPage: React.FC = () => {
    const { user } = useAuth();
    const { fiches, pagination, isLoading, fetchFiches } = useData();
    const navigate = useNavigate();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('all');
    const [selectedSystem, setSelectedSystem] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all'); // New state for status filter
    const [currentPage, setCurrentPage] = useState(1);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedFiche, setSelectedFiche] = useState<CaseStudy | undefined>(undefined);

    useEffect(() => {
        fetchFiches({ 
            page: currentPage, 
            limit: 9, 
            search: searchTerm, 
            theme: selectedTheme, 
            system: selectedSystem, 
            status: selectedStatus, // Pass status to fetchFiches
            sortBy: 'newest' // Sort by newest
        });
    }, [searchTerm, selectedTheme, selectedSystem, selectedStatus, currentPage, fetchFiches]);
    
    const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTheme(e.target.value);
        setCurrentPage(1);
    };
    
    const handleSystemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedSystem(e.target.value);
        setCurrentPage(1);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedStatus(e.target.value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };
    
    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleOpenAssignModal = (fiche: CaseStudy) => {
        setSelectedFiche(fiche);
        setIsAssignModalOpen(true);
    };

    const handleCloseAssignModal = () => {
        setSelectedFiche(undefined);
        setIsAssignModalOpen(false);
    };

    const isAdmin = user?.role === UserRole.ADMIN;
    const isFormateur = user?.role === UserRole.FORMATEUR;

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Toutes les mémofiches</h1>
                    <p className="text-lg text-slate-600 mt-1">Explorez, recherchez et filtrez notre bibliothèque de contenu.</p>
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                        type="text"
                        placeholder="Rechercher une mémofiche..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="md:col-span-1 w-full border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    />
                    <select
                        value={selectedTheme}
                        onChange={handleThemeChange}
                        className="md:col-span-1 w-full border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="all">Tous les thèmes</option>
                        {TOPIC_CATEGORIES[0].topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select
                        value={selectedSystem}
                        onChange={handleSystemChange}
                        className="md:col-span-1 w-full border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                    >
                        <option value="all">Tous les systèmes/organes</option>
                        {TOPIC_CATEGORIES[1].topics.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {(isAdmin || isFormateur) && (
                        <select
                            value={selectedStatus}
                            onChange={handleStatusChange}
                            className="md:col-span-1 w-full border-slate-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                        >
                            <option value="all">Tous les statuts</option>
                            {Object.values(MemoFicheStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {isLoading ? (
                 <div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12 text-teal-600" /></div>
            ) : fiches.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {fiches.map(cs => (
                            <MemoFicheCard key={cs._id} caseStudy={cs} onAssign={handleOpenAssignModal} />
                        ))}
                    </div>
                    {pagination && (
                        <Pagination 
                            currentPage={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                        />
                    )}
                </>
            ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-700">Aucune mémofiche trouvée</h3>
                    <p className="text-slate-500 mt-2">Essayez d'ajuster vos filtres de recherche.</p>
                </div>
            )}

            {isAssignModalOpen && selectedFiche && (
                <AssignFicheToGroupModal fiche={selectedFiche} onClose={handleCloseAssignModal} />
            )}
        </div>
    );
};

export default MemoFichesPage;
