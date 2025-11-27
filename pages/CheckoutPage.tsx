
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Order } from '../types';
import { Spinner, UploadIcon } from '../components/Icons';
import { BANK_DETAILS } from '../constants';

const CheckoutPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId || !token) {
                setIsLoading(false);
                setError('Order ID or authentication token is missing.');
                return;
            }

            try {
                const response = await fetch(`/api/orders/${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to fetch order details.');
                }

                const data: Order = await response.json();
                setOrder(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrder();
    }, [orderId, token]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleSubmitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile || !orderId || !token) {
            alert('Veuillez sélectionner un fichier et vous assurer que vous êtes connecté.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Step 1: Upload the file
            const formData = new FormData();
            formData.append('file', selectedFile);

            const uploadResponse = await fetch('/api/upload/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Échec du téléversement du fichier.');
            }

            const uploadResult = await uploadResponse.json();
            const { fileUrl } = uploadResult;

            // Step 2: Submit the payment proof URL to the order
            const submitResponse = await fetch(`/api/orders/${orderId}/submit-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ proofUrl: fileUrl }),
            });

            if (!submitResponse.ok) {
                throw new Error('Échec de la soumission de la preuve de paiement.');
            }

            alert('Preuve de paiement soumise avec succès ! Votre inscription est en attente de confirmation.');
            navigate('/dashboard');

        } catch (err: any) {
            setError(err.message);
            alert(`Erreur: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="h-12 w-12" /></div>;
    }

    if (error) {
        return <div className="text-center text-red-500 py-10">{error}</div>;
    }

    if (!order) {
        return <div className="text-center text-slate-700 py-10">Commande non trouvée.</div>;
    }

    const VAT_RATE = 0.19;
    const STAMP_DUTY = 1.000;
    const taxAmount = order.totalAmount * VAT_RATE;
    const totalAmountWithVATAndStamp = order.totalAmount + taxAmount + STAMP_DUTY;

    return (
        <div className="bg-slate-100 min-h-screen py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Finaliser votre commande</h1>
                    <p className="text-slate-500 mb-6">Commande N°: {order._id.toString()}</p>

                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-teal-800 mb-4">Récapitulatif de la commande</h2>
                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Montant HT:</span>
                                <span className="font-semibold text-slate-800">{order.totalAmount.toFixed(3)} TND</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">TVA (19%):</span>
                                <span className="font-semibold text-slate-800">{taxAmount.toFixed(3)} TND</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Timbre fiscal:</span>
                                <span className="font-semibold text-slate-800">{STAMP_DUTY.toFixed(3)} TND</span>
                            </div>
                            <hr className="border-t border-teal-200 my-2" />
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-teal-800">Montant Total TTC:</span>
                                <span className="text-3xl font-extrabold text-teal-600">{totalAmountWithVATAndStamp.toFixed(3)} TND</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Instructions de paiement</h3>
                        <p className="text-sm text-slate-600">
                            Veuillez effectuer un virement bancaire du montant total sur le compte suivant, en indiquant votre numéro de commande dans le libellé de la transaction.
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-md text-sm">
                            <p><strong>Titulaire:</strong> {BANK_DETAILS.holder}</p>
                            <p><strong>Banque:</strong> {BANK_DETAILS.bank} ({BANK_DETAILS.branch})</p>
                            <p><strong>RIB:</strong> {BANK_DETAILS.rib}</p>
                            <a href={BANK_DETAILS.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                                <img src={BANK_DETAILS.imageUrl} alt="RIB" className="rounded-md shadow-sm w-full max-w-xs" />
                            </a>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitPayment}>
                        <h3 className="font-semibold text-slate-700 mb-2">Téléverser la preuve de paiement</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Une fois le virement effectué, veuillez téléverser une capture d'écran ou un reçu comme preuve.
                        </p>
                        <div className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-teal-600 hover:text-teal-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-teal-500">
                                        <span>Sélectionner un fichier</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf" />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">{selectedFile ? selectedFile.name : 'PNG, JPG, PDF jusqu\'à 10MB'}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <button
                                type="submit"
                                disabled={!selectedFile || isSubmitting}
                                className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed flex justify-center items-center"
                            >
                                {isSubmitting ? <Spinner className="h-5 w-5" /> : 'Soumettre la preuve de paiement'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
