import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../context/DataContext';
import { CaseStudy, UserRole, MemoFicheStatus } from '../types';
import getAbsoluteImageUrl from '../utils/image';
import { LockClosedIcon, SparklesIcon, Spinner, PencilIcon, TrashIcon, UserGroupIcon } from '../components/Icons';
import { TOPIC_CATEGORIES } from '../constants';
import AssignFicheToGroupModal from '../components/AssignFicheToGroupModal';

// This is the full-featured card, kept for the main memo fiches page
const MemoFicheCard: React.FC<{ 
    caseStudy: CaseStudy, 
    onAssign: (caseStudy: CaseStudy) => void,
    isAllowed?: boolean,
    isPlanningRestricted?: boolean
}> = ({ caseStudy, onAssign, isAllowed = true, isPlanningRestricted = false }) => {
    const { user } = useAuth();
    const { editCaseStudy, deleteCaseStudy } = useData();
    const navigate = useNavigate();
    
    // A fiche is accessible if it's not system-locked AND (planning is not restricted OR it's specifically allowed)
    const canAccess = !caseStudy.isLocked && (!isPlanningRestricted || isAllowed);
    
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
        } else if (caseStudy.isLocked) {
            navigate('/tarifs');
        } else {
            // Case where it's locked by pharmacist
            alert("Cette fiche n'est pas encore ouverte dans votre parcours d'apprentissage par votre pharmacien.");
        }
    };

    return (
        <div className={`group bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col ${!canAccess ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            <div onClick={handleNavigate} className="cursor-pointer relative">
                <div className="relative">
                    <img 
                        src={getAbsoluteImageUrl(caseStudy.coverImageUrl || 'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=2071&auto=format&fit=crop')} 
                        alt={caseStudy.title} 
                        className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        style={{ objectPosition: caseStudy.coverImagePosition || 'center' }}
                    />
                    {!canAccess && (
                        <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center p-4 text-center">
                            <LockClosedIcon className="h-10 w-10 text-white mb-2" />
                            <p className="text-white text-xs font-bold uppercase tracking-widest">
                                {caseStudy.isLocked ? "Premium" : "Verrouillé par le Pharmacien"}
                            </p>
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
    const { user, token } = useAuth();
    const { fiches, pagination, isLoading, fetchFiches } = useData();
    const navigate = useNavigate();
    
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTheme, setSelectedTheme] = useState('all');
    const [selectedSystem, setSelectedSystem] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all'); // New state for status filter
    const [currentPage, setCurrentPage] = useState(1);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedFiche, setSelectedFiche] = useState<CaseStudy | undefined>(undefined);

    // Planning restriction state
    const [allowedFicheIds, setAllowedFicheIds] = useState<Set<string>>(new Set());
    const [isPlanningRestricted, setIsPlanningRestricted] = useState(false);

    useEffect(() => {
        const fetchPlanning = async () => {
            if (!user || user.role !== UserRole.PREPARATEUR) return;
            try {
                const response = await fetch('/api/groups', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const group = await response.json();
                    if (group.isPlanningEnabled && group.planning && group.planning.length > 0) {
                        const now = new Date();
                        const allowed = new Set<string>();
                        let hasActivePlanning = false;

                        group.planning.forEach((item: any) => {
                            if (!item.active) return;
                            const start = new Date(item.startDate);
                            const end = item.endDate ? new Date(item.endDate) : null;
                            
                            // A fiche is allowed if it's active and start date is past
                            // If end date exists, must be future
                            if (start <= now && (!end || end >= now)) {
                                allowed.add(item.ficheId);
                                hasActivePlanning = true;
                            }
                        });

                        // Only restrict if the pharmacist has actually enabled planning AND set up active items
                        if (hasActivePlanning) {
                            setAllowedFicheIds(allowed);
                            setIsPlanningRestricted(true);
                        }
                    } else {
                        // Planning disabled or empty
                        setIsPlanningRestricted(false);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch group planning:", error);
            }
        };
        fetchPlanning();
    }, [user, token]);

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
                            <MemoFicheCard 
                                key={cs._id} 
                                caseStudy={cs} 
                                onAssign={handleOpenAssignModal} 
                                isAllowed={allowedFicheIds.has(cs._id.toString())}
                                isPlanningRestricted={isPlanningRestricted}
                            />
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
