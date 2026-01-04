import React, { useState, useEffect } from 'react';
import { AdCampaign } from '../../types';
import { campaignService } from '../../services/campaignService';
import { PlusIcon, PencilIcon, TrashIcon, PlayIcon, PauseIcon } from '@heroicons/react/24/outline';
import Loader from '../../components/Loader';

const CampaignsManager: React.FC = () => {
    const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentCampaign, setCurrentCampaign] = useState<Partial<AdCampaign>>({});
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        try {
            const data = await campaignService.getAllCampaigns();
            setCampaigns(data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            if (isEditing && currentCampaign._id) {
                await campaignService.updateCampaign(currentCampaign._id as string, currentCampaign);
            } else {
                await campaignService.createCampaign(currentCampaign as any);
            }
            setIsModalOpen(false);
            fetchCampaigns();
        } catch (error) {
            console.error('Error saving campaign:', error);
            alert('Erreur lors de la sauvegarde de la campagne.');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Êtes-vous sûr de vouloir supprimer cette campagne ?')) {
            try {
                await campaignService.deleteCampaign(id);
                fetchCampaigns();
            } catch (error) {
                console.error('Error deleting campaign:', error);
            }
        }
    };

    const toggleActive = async (campaign: AdCampaign) => {
        try {
            await campaignService.updateCampaign(campaign._id as string, { active: !campaign.active });
            fetchCampaigns();
        } catch (error) {
            console.error('Error toggling campaign status:', error);
        }
    };

    const openModal = (campaign?: AdCampaign) => {
        if (campaign) {
            setCurrentCampaign(campaign);
            setIsEditing(true);
        } else {
            setCurrentCampaign({
                active: true,
                keywords: [],
                sponsorName: '',
                productName: '',
                description: '',
                link: '',
                imageUrl: ''
            });
            setIsEditing(false);
        }
        setIsModalOpen(true);
    };

    if (loading) return <Loader />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Gestion des Campagnes Publicitaires</h1>
                <button
                    onClick={() => openModal()}
                    className="flex items-center px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Nouvelle Campagne
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sponsor / Produit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mots-clés</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Impressions / Clics</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {campaigns.map((campaign) => (
                            <tr key={campaign._id as string}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={() => toggleActive(campaign)}
                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            campaign.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}
                                    >
                                        {campaign.active ? 'Actif' : 'Inactif'}
                                    </button>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900">{campaign.productName}</div>
                                    <div className="text-sm text-gray-500">{campaign.sponsorName}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {campaign.keywords.map((k, i) => (
                                            <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    <div>Vue : {campaign.impressions || 0}</div>
                                    <div>Clics : {campaign.clicks || 0}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => openModal(campaign)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button onClick={() => handleDelete(campaign._id as string)} className="text-red-600 hover:text-red-900">
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">{isEditing ? 'Modifier la campagne' : 'Nouvelle campagne'}</h2>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nom du Sponsor</label>
                                    <input
                                        type="text"
                                        value={currentCampaign.sponsorName || ''}
                                        onChange={(e) => setCurrentCampaign({ ...currentCampaign, sponsorName: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Nom du Produit</label>
                                    <input
                                        type="text"
                                        value={currentCampaign.productName || ''}
                                        onChange={(e) => setCurrentCampaign({ ...currentCampaign, productName: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={currentCampaign.description || ''}
                                    onChange={(e) => setCurrentCampaign({ ...currentCampaign, description: e.target.value })}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mots-clés (séparés par des virgules)</label>
                                <input
                                    type="text"
                                    value={currentCampaign.keywords?.join(', ') || ''}
                                    onChange={(e) => setCurrentCampaign({ ...currentCampaign, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k) })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    placeholder="Ex: rhume, nez bouché, fièvre"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lien de redirection</label>
                                <input
                                    type="text"
                                    value={currentCampaign.link || ''}
                                    onChange={(e) => setCurrentCampaign({ ...currentCampaign, link: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">URL de l'image</label>
                                <input
                                    type="text"
                                    value={currentCampaign.imageUrl || ''}
                                    onChange={(e) => setCurrentCampaign({ ...currentCampaign, imageUrl: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={currentCampaign.active || false}
                                    onChange={(e) => setCurrentCampaign({ ...currentCampaign, active: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">Campagne active</label>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignsManager;
