import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, CheckCircleIcon, XCircleIcon, UploadIcon } from '../../components/Icons';

interface Subscriber {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    planName: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    latestOrder?: {
        _id: string;
        status: string;
        paymentProofUrl?: string;
        totalAmount: number;
    } | null;
}

const SubscriptionManagement: React.FC = () => {
    const { token } = useAuth();
    const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadingId, setUploadingId] = useState<string | null>(null);

    const fetchSubscribers = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/subscriptions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSubscribers(data);
            }
        } catch (error) {
            console.error('Failed to fetch subscribers:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscribers();
    }, [token]);

    const handleFileUpload = async (userId: string, file: File) => {
        setUploadingId(userId);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`/api/admin/subscriptions/${userId}/upload-proof`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                alert('Justificatif téléchargé avec succès !');
                fetchSubscribers(); // Refresh list
            } else {
                alert('Erreur lors du téléchargement.');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Erreur lors du téléchargement.');
        } finally {
            setUploadingId(null);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    if (isLoading) return <div className="flex justify-center p-10"><Spinner className="h-10 w-10 text-teal-600" /></div>;

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestion des Abonnements & Justificatifs</h1>
            
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pharmacien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonnement</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière Commande</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Preuve Paiement</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {subscribers.map(sub => (
                            <tr key={sub._id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{sub.firstName} {sub.lastName}</div>
                                            <div className="text-sm text-gray-500">{sub.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-teal-100 text-teal-800">
                                        {sub.planName || 'Inconnu'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div>Début: {formatDate(sub.subscriptionStartDate)}</div>
                                    <div>Fin: {formatDate(sub.subscriptionEndDate)}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {sub.latestOrder ? (
                                        <div>
                                            <div>ID: {sub.latestOrder._id.substring(0, 8)}...</div>
                                            <div className={`font-bold ${sub.latestOrder.status === 'CONFIRMED' ? 'text-green-600' : 'text-orange-600'}`}>
                                                {sub.latestOrder.status}
                                            </div>
                                            <div>{sub.latestOrder.totalAmount} TND</div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Aucune</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <div className="flex flex-col space-y-2">
                                        {sub.latestOrder?.paymentProofUrl ? (
                                            <a 
                                                href={sub.latestOrder.paymentProofUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-teal-600 hover:text-teal-900 flex items-center"
                                            >
                                                <CheckCircleIcon className="h-5 w-5 mr-1" />
                                                Voir le justificatif
                                            </a>
                                        ) : (
                                            <div className="text-orange-500 flex items-center">
                                                <XCircleIcon className="h-5 w-5 mr-1" />
                                                Manquant
                                            </div>
                                        )}
                                        
                                        <label className="cursor-pointer bg-white border border-gray-300 rounded-md shadow-sm px-3 py-1 inline-flex items-center text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            <UploadIcon className="h-4 w-4 mr-2 text-gray-500" />
                                            {uploadingId === sub._id ? 'Envoi...' : (sub.latestOrder?.paymentProofUrl ? 'Remplacer' : 'Ajouter')}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileUpload(sub._id, e.target.files[0]);
                                                    }
                                                }}
                                                accept="image/*,.pdf"
                                                disabled={uploadingId === sub._id}
                                            />
                                        </label>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SubscriptionManagement;