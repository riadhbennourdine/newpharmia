import React, { useState, useEffect } from 'react';
import { Group, GroupAssignment } from '../types';
import algoliasearch from 'algoliasearch/lite';
import { TrashIcon, PlusCircleIcon, CalendarIcon, CheckCircleIcon, XCircleIcon } from './Icons';

// Algolia Config
const ALGOLIA_APP_ID = 'U8M4DQYZUH';
const ALGOLIA_SEARCH_KEY = '2b79ffdfe77107245e684764280f339a';
const ALGOLIA_INDEX_NAME = 'memofiches';

const searchClient = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY);
const index = searchClient.initIndex(ALGOLIA_INDEX_NAME);

interface Props {
    group: Group;
    onUpdate: () => void;
}

const TeamPlanning: React.FC<Props> = ({ group, onUpdate }) => {
    const [planning, setPlanning] = useState<GroupAssignment[]>(group.planning || []);
    const [isPlanningEnabled, setIsPlanningEnabled] = useState(group.isPlanningEnabled || false);
    const [ficheDetails, setFicheDetails] = useState<Record<string, string>>({}); // id -> title
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Load titles for existing items
    useEffect(() => {
        const idsToFetch = planning
            .map(p => p.ficheId)
            .filter(id => !ficheDetails[id]); // Only missing ones

        if (idsToFetch.length === 0) return;

        // We can use Algolia 'getObjects' if we had it, or just our API
        // For simplicity/performance, let's use our API batch endpoint if it exists, or just loop fetch (not ideal but works for MVP)
        // Actually, let's just use the GET /api/memofiches/:id for now.
        // A better way: POST /api/memofiches/batch { ids: [...] }
        
        const fetchTitles = async () => {
             // Fallback: fetch one by one (optimize later)
             const newDetails = { ...ficheDetails };
             await Promise.all(idsToFetch.map(async (id) => {
                 try {
                     const res = await fetch(`/api/memofiches/${id}`);
                     if (res.ok) {
                         const data = await res.json();
                         newDetails[id] = data.title;
                     } else {
                         newDetails[id] = `Fiche introuvable (${res.status})`;
                     }
                 } catch (e) {
                     console.error(e);
                     newDetails[id] = "Erreur chargement";
                 }
             }));
             setFicheDetails(newDetails);
        };
        fetchTitles();
    }, [planning]);

    // Search Logic
    useEffect(() => {
        if (searchQuery.length > 1) {
            index.search(searchQuery).then(({ hits }) => {
                setSearchResults(hits);
            });
        } else {
            setSearchResults([]);
        }
    }, [searchQuery]);

    const handleAddFiche = (hit: any) => {
        // Check if already in planning
        if (planning.some(p => p.ficheId === hit.objectID)) {
            setMessage({ type: 'error', text: "Cette fiche est déjà dans le planning." });
            return;
        }

        const newAssignment: GroupAssignment = {
            ficheId: hit.objectID,
            startDate: new Date(),
            endDate: undefined,
            active: true
        };

        setPlanning([...planning, newAssignment]);
        setFicheDetails(prev => ({ ...prev, [hit.objectID]: hit.title }));
        setSearchQuery('');
        setSearchResults([]);
    };

    const handleRemove = (index: number) => {
        const newPlanning = [...planning];
        newPlanning.splice(index, 1);
        setPlanning(newPlanning);
    };

    const handleChange = (index: number, field: keyof GroupAssignment, value: any) => {
        const newPlanning = [...planning];
        newPlanning[index] = { ...newPlanning[index], [field]: value };
        setPlanning(newPlanning);
    };

    const savePlanning = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const token = localStorage.getItem('token'); 
            const response = await fetch(`/api/groups/${group._id}/planning`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planning, isPlanningEnabled })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: "Planning et mode de parcours enregistrés !" });
                onUpdate();
            } else {
                throw new Error("Erreur sauvegarde");
            }
        } catch (error) {
            setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-teal-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-2xl font-bold text-teal-600 flex items-center gap-2">
                    <CalendarIcon className="h-6 w-6" />
                    Pilotage du Parcours
                </h2>

                <div className="flex items-center gap-3 bg-slate-50 p-2 px-4 rounded-full border border-slate-200 shadow-sm">
                    <span className={`text-sm font-bold ${isPlanningEnabled ? 'text-teal-600' : 'text-slate-500'}`}>
                        {isPlanningEnabled ? '🔒 Parcours Guidé' : '🔓 Parcours Libre'}
                    </span>
                    <button 
                        onClick={() => setIsPlanningEnabled(!isPlanningEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isPlanningEnabled ? 'bg-teal-600' : 'bg-slate-300'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isPlanningEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {isPlanningEnabled && (
                <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-lg text-sm text-teal-800">
                    <strong>Mode Guidé Actif :</strong> Seules les fiches prévues ci-dessous seront accessibles par vos préparateurs. Les autres seront grisées dans leur bibliothèque.
                </div>
            )}

            {/* Search Bar */}
            <div className="mb-6 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ajouter une fiche au parcours</label>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher une mémofiche..."
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                />
                {searchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-lg mt-1 z-50 max-h-60 overflow-y-auto">
                        {searchResults.map(hit => (
                            <button
                                key={hit.objectID}
                                onClick={() => handleAddFiche(hit)}
                                className="w-full text-left p-3 hover:bg-teal-50 border-b border-slate-100 last:border-0"
                            >
                                <p className="font-bold text-slate-800">{hit.title}</p>
                                <p className="text-xs text-slate-500">{hit.theme}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Planning List */}
            <div className="space-y-4">
                {planning.length === 0 ? (
                    <p className="text-center text-slate-500 italic py-4">Aucune fiche planifiée.</p>
                ) : (
                    planning.map((item, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex-1 w-full">
                                <p className="font-bold text-slate-800">{ficheDetails[item.ficheId] || "Chargement..."}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="flex flex-col">
                                    <label className="text-xs text-slate-500">Début</label>
                                    <input 
                                        type="date" 
                                        value={item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleChange(idx, 'startDate', new Date(e.target.value))}
                                        className="text-sm p-1 border rounded"
                                    />
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs text-slate-500">Fin (Optionnel)</label>
                                    <input 
                                        type="date" 
                                        value={item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleChange(idx, 'endDate', e.target.value ? new Date(e.target.value) : undefined)}
                                        className="text-sm p-1 border rounded"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => handleChange(idx, 'active', !item.active)}
                                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}
                                >
                                    {item.active ? <CheckCircleIcon className="h-4 w-4" /> : <XCircleIcon className="h-4 w-4" />}
                                    {item.active ? 'Actif' : 'Inactif'}
                                </button>
                                <button 
                                    onClick={() => handleRemove(idx)}
                                    className="text-red-500 hover:text-red-700 p-2"
                                    title="Supprimer"
                                >
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 flex justify-end items-center gap-4">
                {message && (
                    <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {message.text}
                    </span>
                )}
                <button
                    onClick={savePlanning}
                    disabled={isSaving}
                    className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
                >
                    {isSaving ? "Enregistrement..." : "Enregistrer le planning"}
                </button>
            </div>
        </div>
    );
};

export default TeamPlanning;
