
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Order, Webinar, WebinarGroup, ProductType } from '../types';
import { Spinner, UploadIcon } from '../components/Icons';
import * as Constants from '../constants';

const CheckoutPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { token } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [webinarsInOrder, setWebinarsInOrder] = useState<Webinar[]>([]);
    const [applyVat, setApplyVat] = useState(true);
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
                const orderResponse = await fetch(`/api/orders/${orderId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!orderResponse.ok) {
                    const errorData = await orderResponse.json();
                    throw new Error(errorData.message || 'Failed to fetch order details.');
                }

                const orderData: Order = await orderResponse.json();
                setOrder(orderData);

                // Fetch webinar details for webinar items only
                const webinarIds = orderData.items
                    .filter(item => (!item.type || item.type === ProductType.WEBINAR) && item.webinarId)
                    .map(item => item.webinarId);

                if (webinarIds.length > 0) {
                    const webinarsResponse = await fetch('/api/webinars/by-ids', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ ids: webinarIds }),
                    });

                    if (!webinarsResponse.ok) {
                        throw new Error('Failed to fetch webinar details.');
                    }

                    const fetchedWebinars: Webinar[] = await webinarsResponse.json();
                    setWebinarsInOrder(fetchedWebinars);
                } else {
                    setWebinarsInOrder([]);
                }

                // Determine if VAT should be applied (only if ALL items are CROP_TUNIS webinars)
                // If there is ANY pack or NON-CROP webinar, VAT logic might differ. 
                // Based on previous requests: 
                // CROP = 80DT (TTC included usually, or fixed).
                // MasterClass = HT + Taxes. 
                // The backend `orders.ts` already calculated the Total Amount WITH taxes for Packs.
                // But `orders.ts` for Webinars summed `price` or `WEBINAR_PRICE`.
                
                // Let's assume the `totalAmount` from the order is the reference.
                // However, this display page recalculates tax for display purposes.
                
                // Logic: 
                // If Order contains ANY Master Class Pack -> It's subject to tax breakdown display if we want to show it, 
                // BUT the order.totalAmount in DB is already the final sum calculated by backend.
                // The current frontend calculates `taxAmount` on top of `order.totalAmount`. 
                // !! CRITICAL !!: Backend `orders.ts` calculates `totalAmount` differently for Packs vs Webinars.
                // For Packs: totalAmount = (HT * 1.19) + 1. It IS the TTC.
                // For Webinars: totalAmount = Sum(price).
                
                // If we display "Total HT" + "TVA" = "Total TTC", we need to reverse calc from the DB total if it's already TTC.
                // OR we accept that `order.totalAmount` IS the final amount to pay.
                
                // Let's simplify: Display `order.totalAmount` as the "Net à payer".
                // If we want to show details:
                // Packs are TTC.
                // CROP are TTC (80DT).
                
                // So, setApplyVat(false) to avoid ADDING taxes on top of what's already calculated.
                setApplyVat(false); 

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
                const errorBody = await uploadResponse.text();
                console.error('Upload failed:', uploadResponse.status, errorBody);
                throw new Error(`Échec du téléversement du fichier. Le serveur a répondu avec le statut : ${uploadResponse.status}`);
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
                const errorBody = await submitResponse.text();
                console.error('Payment submission failed:', submitResponse.status, errorBody);
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

    const renderOrderItems = () => {
        if (!order) return null;
        return (
            <ul className="mb-4 space-y-2 text-sm text-slate-600">
                {webinarsInOrder.map(w => (
                    <li key={w._id.toString()} className="flex justify-between">
                        <span>Webinaire: {w.title}</span>
                        <span>{w.price ? w.price.toFixed(3) : '80.000'} TND</span>
                    </li>
                ))}
                {order.items.filter(i => i.type === ProductType.PACK || !!i.packId).map((item, idx) => {
                    const pack = Constants.MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                    // Calculate TTC for display if needed, but order.totalAmount has the sum
                    const priceHT = pack ? pack.priceHT : 0;
                    const priceTTC = (priceHT * (1 + Constants.TAX_RATES.TVA)) + Constants.TAX_RATES.TIMBRE;
                    return (
                        <li key={`pack-${idx}`} className="flex justify-between">
                            <span>Pack: {pack ? pack.name : item.packId}</span>
                            <span>{priceTTC.toFixed(3)} TND <span className="text-xs text-slate-400">(TTC)</span></span>
                        </li>
                    );
                })}
            </ul>
        );
    };

    // Determine Bank Details based on Order Content
    // Robust check: Check type, packId existence, or MC prefix
    const hasPacks = order?.items.some(i => i.type === ProductType.PACK || !!i.packId || (i.productId && i.productId.startsWith('MC')));
    const hasMasterClassWebinars = webinarsInOrder.some(w => w.group === WebinarGroup.MASTER_CLASS);
    const useSkillSeed = hasPacks || hasMasterClassWebinars;
    const bankDetails = useSkillSeed ? Constants.SKILL_SEED_BANK_DETAILS : Constants.CROPT_BANK_DETAILS;

    const isPdfRib = bankDetails.imageUrl.toLowerCase().includes('.pdf');

    return (
        <div className="bg-slate-100 min-h-screen py-12">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-3xl font-bold text-slate-800 mb-2">Finaliser votre commande</h1>
                    <p className="text-slate-500 mb-6">Commande N°: {order._id.toString()}</p>

                    <div className="bg-teal-50 border border-teal-200 rounded-lg p-6 mb-6">
                        <h2 className="text-xl font-bold text-teal-800 mb-4">Récapitulatif de la commande</h2>
                        
                        {renderOrderItems()}

                        <hr className="border-t border-teal-200 my-4" />
                        
                        {/* Tax Breakdown */}
                        <div className="space-y-2 text-sm text-slate-600">
                            {(() => {
                                // Calculate totals dynamically for display
                                let totalHT = 0;
                                let totalTVA = 0;
                                const stampDuty = Constants.TAX_RATES.TIMBRE;

                                // Packs (Base Price is HT)
                                const packs = order.items.filter(i => i.type === ProductType.PACK);
                                packs.forEach(item => {
                                    const pack = Constants.MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                                    if (pack) {
                                        totalHT += pack.priceHT;
                                        totalTVA += pack.priceHT * Constants.TAX_RATES.TVA;
                                    }
                                });

                                // Webinars (Base Price is assumed TTC for CROP, or we treat it as HT if tax applies?)
                                // Current business rule: CROP webinars are 80DT TTC.
                                // If we have mixed basket, we add crop price to Total to Pay directly, 
                                // but for a cleaner breakdown, we can display them separately or assume 0 tax on them if exempt.
                                // Let's simplify: Display breakdown ONLY if there are taxable items (Packs).
                                // If only CROP webinars, display simple total.
                                
                                const cropWebinars = webinarsInOrder.filter(w => w.group === WebinarGroup.CROP_TUNIS);
                                const cropTotalTTC = cropWebinars.reduce((sum, w) => sum + (w.price || 80.000), 0);
                                
                                // Total Calculation
                                const finalTotal = totalHT + totalTVA + stampDuty + cropTotalTTC;
                                
                                if (packs.length > 0) {
                                    return (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Total Hors Taxes (Packs):</span>
                                                <span>{totalHT.toFixed(3)} TND</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>TVA (19%):</span>
                                                <span>{totalTVA.toFixed(3)} TND</span>
                                            </div>
                                            {cropTotalTTC > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Webinaires CROP (Net):</span>
                                                    <span>{cropTotalTTC.toFixed(3)} TND</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between">
                                                <span>Timbre Fiscal:</span>
                                                <span>{stampDuty.toFixed(3)} TND</span>
                                            </div>
                                        </>
                                    );
                                }
                                return null; // No breakdown for simple CROP orders
                            })()}
                        </div>

                        <hr className="border-t border-teal-200 my-4" />
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-teal-800">Montant Total à payer:</span>
                            <span className="text-3xl font-extrabold text-teal-600">{order.totalAmount.toFixed(3)} TND</span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="font-semibold text-slate-700 mb-2">Instructions de paiement</h3>
                        <p className="text-sm text-slate-600">
                            Veuillez effectuer un virement bancaire du montant total sur le compte suivant, en indiquant votre numéro de commande dans le libellé de la transaction.
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-md text-sm border border-slate-200">
                            <p className="mb-1"><strong>Bénéficiaire:</strong> {bankDetails.holder}</p>
                            <p className="mb-1"><strong>Banque:</strong> {bankDetails.bank} ({bankDetails.branch})</p>
                            <p className="mb-3"><strong>RIB:</strong> <span className="font-mono text-base bg-slate-100 px-2 py-1 rounded">{bankDetails.rib}</span></p>
                            
                            {isPdfRib ? (
                                <a 
                                    href={bankDetails.imageUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="mt-2 inline-flex items-center text-teal-600 hover:text-teal-700 font-medium"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                    Télécharger le RIB (PDF)
                                </a>
                            ) : (
                                <a href={bankDetails.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                                    <img src={bankDetails.imageUrl} alt="RIB" className="rounded-md shadow-sm w-full max-w-xs" />
                                </a>
                            )}
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
