
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Order, Webinar, WebinarGroup, ProductType } from '../types';
import { Spinner, UploadIcon } from '../components/Icons';
import { MASTER_CLASS_PACKS, TAX_RATES, CROPT_BANK_DETAILS, SKILL_SEED_BANK_DETAILS, WEBINAR_PRICE } from '../constants';

const CheckoutPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [order, setOrder] = useState<Order | null>(null);
    const [webinarsInOrder, setWebinarsInOrder] = useState<Webinar[]>([]);
    const [applyVat, setApplyVat] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | null>(null);
    const [isKonnectLoading, setIsKonnectLoading] = useState(false);

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

    const handleKonnectPayment = async () => {
        if (!order || !token) return;
        setIsKonnectLoading(true);
        setError(null);

        // Calculate total amount
        let totalAmount = 0;
        let calculatedTotalHT = 0;
        let calculatedTotalTVA = 0;
        const calculatedStampDuty = TAX_RATES.TIMBRE;
        let cropWebinarsTTC = 0;

        order.items.forEach(item => {
            const isPack = item.type === ProductType.PACK || !!item.packId;
            if (isPack && item.packId) {
                const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                if (pack) {
                    calculatedTotalHT += pack.priceHT;
                    calculatedTotalTVA += pack.priceHT * TAX_RATES.TVA;
                }
            } else {
                const webinarDetails = webinarsInOrder.find(w => w._id === (item.webinarId || item.productId));
                if (webinarDetails) {
                    if (webinarDetails.group === WebinarGroup.MASTER_CLASS) {
                        const webinarBasePrice = webinarDetails.price || 0;
                        calculatedTotalHT += webinarBasePrice;
                        calculatedTotalTVA += webinarBasePrice * TAX_RATES.TVA;
                    } else if (webinarDetails.group === WebinarGroup.CROP_TUNIS) {
                        cropWebinarsTTC += (webinarDetails.price || 80.000);
                    }
                }
            }
        });
        const hasTaxableItems = calculatedTotalHT > 0 || calculatedTotalTVA > 0;
        totalAmount = calculatedTotalHT + calculatedTotalTVA + (hasTaxableItems ? calculatedStampDuty : 0) + cropWebinarsTTC;

        try {
            const response = await fetch('/api/konnect/initiate-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: totalAmount,
                    orderId: order._id,
                    firstName: user?.firstName,
                    lastName: user?.lastName,
                    email: user?.email,
                    phoneNumber: user?.phone
                })
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Erreur lors de l\'initialisation du paiement');
            }

            const data = await response.json();
            if (data.payUrl) {
                window.location.href = data.payUrl;
            } else {
                throw new Error('URL de paiement non reçue');
            }

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erreur de paiement');
        } finally {
            setIsKonnectLoading(false);
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
                {webinarsInOrder.map(w => {
                    const webinarBasePrice = w.price || 0; // MC prices are HT, CROP will use WEBINAR_PRICE
                    let itemDisplayPrice = 0;
                    if (w.group === WebinarGroup.MASTER_CLASS) {
                        itemDisplayPrice = (webinarBasePrice * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
                    } else if (w.group === WebinarGroup.CROP_TUNIS) {
                        itemDisplayPrice = WEBINAR_PRICE; // Fixed 80.000 TTC
                    } else { // Fallback for other webinar types, if any
                        itemDisplayPrice = (webinarBasePrice * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
                    }
                    return (
                        <li key={w._id.toString()} className="flex justify-between">
                            <span>Webinaire: {w.title}</span>
                            <span>{itemDisplayPrice.toFixed(3)} TND <span className="text-xs text-slate-400">(TTC)</span></span>
                        </li>
                    );
                })}
                {order.items.filter(i => i.type === ProductType.PACK || !!i.packId).map((item, idx) => {
                    const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                    // Calculate TTC for display if needed, but order.totalAmount has the sum
                    const priceHT = pack ? pack.priceHT : 0;
                    const priceTTC = (priceHT * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
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
    const hasPacks = order?.items.some(i => i.type === ProductType.PACK || !!i.packId || (i.productId && i.productId.startsWith('MC')));
    const hasMasterClassWebinars = webinarsInOrder.some(w => w.group === WebinarGroup.MASTER_CLASS);
    const useSkillSeed = hasPacks || hasMasterClassWebinars;
    
    // Fallback object to prevent crash if import fails
    const defaultBank = { holder: 'N/A', bank: 'N/A', branch: '', rib: 'N/A', imageUrl: '' };
    
    const bankDetails = (useSkillSeed ? SKILL_SEED_BANK_DETAILS : CROPT_BANK_DETAILS) || defaultBank;

    const isPdfRib = bankDetails.imageUrl ? bankDetails.imageUrl.toLowerCase().includes('.pdf') : false;

    // Determine if Konnect (card) payment should be available (only for MasterClass items)
    const containsMasterClassItems = hasPacks || hasMasterClassWebinars;

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
                                let calculatedTotalHT = 0;
                                let calculatedTotalTVA = 0;
                                const calculatedStampDuty = TAX_RATES.TIMBRE;
                                let cropWebinarsTTC = 0; // For CROP webinars, their price is already TTC

                                order.items.forEach(item => {
                                    const isPack = item.type === ProductType.PACK || !!item.packId;
                                    
                                    if (isPack && item.packId) {
                                        const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                                        if (pack) {
                                            calculatedTotalHT += pack.priceHT;
                                            calculatedTotalTVA += pack.priceHT * TAX_RATES.TVA;
                                        }
                                    } else { // Assume it's a webinar
                                        const webinarDetails = webinarsInOrder.find(w => w._id === (item.webinarId || item.productId));
                                        if (webinarDetails) {
                                            if (webinarDetails.group === WebinarGroup.MASTER_CLASS) {
                                                const webinarBasePrice = webinarDetails.price || 0; // MC prices are HT
                                                calculatedTotalHT += webinarBasePrice;
                                                calculatedTotalTVA += webinarBasePrice * TAX_RATES.TVA;
                                            } else if (webinarDetails.group === WebinarGroup.CROP_TUNIS) {
                                                cropWebinarsTTC += (webinarDetails.price || 80.000); // CROP prices are considered TTC (e.g. 80.000 DT)
                                            }
                                        }
                                    }
                                });

                                const hasTaxableItems = calculatedTotalHT > 0 || calculatedTotalTVA > 0;
                                const finalCalculatedTTC = calculatedTotalHT + calculatedTotalTVA + (hasTaxableItems ? calculatedStampDuty : 0) + cropWebinarsTTC;
                                
                                return (
                                    <>
                                        {hasTaxableItems && (
                                            <>
                                                <div className="flex justify-between">
                                                    <span>Total Hors Taxes:</span>
                                                    <span>{calculatedTotalHT.toFixed(3)} TND</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>TVA ({TAX_RATES.TVA * 100}%):</span>
                                                    <span>{calculatedTotalTVA.toFixed(3)} TND</span>
                                                </div>
                                            </>
                                        )}
                                        {calculatedStampDuty > 0 && hasTaxableItems && (
                                            <div className="flex justify-between">
                                                <span>Timbre Fiscal:</span>
                                                <span>{calculatedStampDuty.toFixed(3)} TND</span>
                                            </div>
                                        )}
                                        {cropWebinarsTTC > 0 && (
                                            <div className="flex justify-between">
                                                <span>Webinaires CROP (Net):</span>
                                                <span>{cropWebinarsTTC.toFixed(3)} TND</span>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}
                        </div>

                        <hr className="border-t border-teal-200 my-4" />
                        <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-teal-800">Montant Total à payer:</span>
                            <span className="text-3xl font-extrabold text-teal-600">{
                                (
                                    (() => {
                                        let finalCalculatedTTC = 0;
                                        let calculatedTotalHT = 0;
                                        let calculatedTotalTVA = 0;
                                        const calculatedStampDuty = TAX_RATES.TIMBRE;
                                        let cropWebinarsTTC = 0;

                                        order.items.forEach(item => {
                                            const isPack = item.type === ProductType.PACK || !!item.packId;
                                            
                                            if (isPack && item.packId) {
                                                const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                                                if (pack) {
                                                    calculatedTotalHT += pack.priceHT;
                                                    calculatedTotalTVA += pack.priceHT * TAX_RATES.TVA;
                                                }
                                            } else { // Assume it's a webinar
                                                const webinarDetails = webinarsInOrder.find(w => w._id === (item.webinarId || item.productId));
                                                if (webinarDetails) {
                                                    if (webinarDetails.group === WebinarGroup.MASTER_CLASS) {
                                                        const webinarBasePrice = webinarDetails.price || 0; // MC prices are HT
                                                        calculatedTotalHT += webinarBasePrice;
                                                        calculatedTotalTVA += webinarBasePrice * TAX_RATES.TVA;
                                                    } else if (webinarDetails.group === WebinarGroup.CROP_TUNIS) {
                                                        cropWebinarsTTC += (webinarDetails.price || 80.000); // CROP prices are considered TTC
                                                    }
                                                }
                                            }
                                        });
                                        const hasTaxableItems = calculatedTotalHT > 0 || calculatedTotalTVA > 0;
                                        finalCalculatedTTC = calculatedTotalHT + calculatedTotalTVA + (hasTaxableItems ? calculatedStampDuty : 0) + cropWebinarsTTC;
                                        return finalCalculatedTTC;
                                    })()
                                ).toFixed(3)
                            } TND</span>
                        </div>
                    </div>

                    {/* Payment Method Selection */}
                    {!paymentMethod ? (
                        <div className="mt-8">
                            <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">Choisissez votre mode de paiement</h3>
                            <div className={`grid gap-6 ${containsMasterClassItems ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-1'}`}>
                                {containsMasterClassItems && (
                                    <button
                                        onClick={() => setPaymentMethod('card')}
                                        className="flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-xl hover:border-teal-500 hover:shadow-lg transition-all group"
                                    >
                                        <div className="h-16 w-16 bg-teal-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                                            <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-800">Paiement par Carte</h4>
                                        <p className="text-sm text-slate-500 text-center mt-2">Paiement sécurisé via Konnect (Bancaire ou E-Dinar)</p>
                                        <span className="mt-4 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg group-hover:bg-teal-700">Choisir</span>
                                    </button>
                                )}
                                {/* Always show transfer payment */}
                                <button
                                    onClick={() => setPaymentMethod('transfer')}
                                    className={`flex flex-col items-center justify-center p-8 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all group ${!containsMasterClassItems ? 'col-span-full' : ''}`}
                                >
                                    <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800">Virement Bancaire</h4>
                                    <p className="text-sm text-slate-500 text-center mt-2">Virement direct sur notre compte bancaire</p>
                                    <span className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg group-hover:bg-blue-700">Choisir</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-8 animate-fadeIn">
                            <button 
                                onClick={() => setPaymentMethod(null)}
                                className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-800 transition-colors"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Changer de méthode
                            </button>

                            {paymentMethod === 'card' && (
                                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                                    <div className="mb-6">
                                        <div className="mx-auto h-20 w-20 bg-teal-50 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-bold text-slate-800 mb-2">Paiement en ligne</h3>
                                        <p className="text-slate-600 max-w-md mx-auto">
                                            Vous allez être redirigé vers notre plateforme de paiement sécurisée Konnect pour finaliser votre transaction.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleKonnectPayment}
                                        disabled={isKonnectLoading}
                                        className="w-full max-w-md mx-auto bg-teal-600 text-white font-bold py-4 px-6 rounded-lg shadow-lg hover:bg-teal-700 transition-all transform hover:-translate-y-1 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:transform-none flex justify-center items-center"
                                    >
                                        {isKonnectLoading ? (
                                            <>
                                                <Spinner className="h-5 w-5 mr-3" />
                                                Initialisation...
                                            </>
                                        ) : (
                                            "Payer maintenant"
                                        )}
                                    </button>
                                </div>
                            )}

                            {paymentMethod === 'transfer' && (
                                <div>
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
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;
