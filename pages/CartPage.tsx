import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth';
import { Webinar, ProductType } from '../types';
import { Spinner, TrashIcon, EditIcon } from '../components/Icons';
import { WEBINAR_PRICE, MASTER_CLASS_PACKS, TAX_RATES } from '../constants';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { token } = useAuth();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWebinarDetails = async () => {
      // Filter items that are webinars (infer if not pack)
      const webinarItems = cartItems.filter(item => {
          const isPack = item.type === ProductType.PACK || !!item.packId;
          return !isPack;
      });
      
      if (webinarItems.length === 0) {
        setWebinars([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const webinarIds = webinarItems.map(item => item.webinarId || item.id).filter(id => id);
        // De-duplicate IDs for fetching
        const uniqueIds = Array.from(new Set(webinarIds));
        
        if (uniqueIds.length === 0) {
             setWebinars([]);
             setIsLoading(false);
             return;
        }

        const response = await fetch('/api/webinars/by-ids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: uniqueIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch webinar details.');
        }

        const data: Webinar[] = await response.json();
        setWebinars(data);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinarDetails();
  }, [cartItems]);

  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => {
        const isPack = item.type === ProductType.PACK || !!item.packId;
        
        if (isPack && item.packId) {
            const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
            if (pack) {
                return total + (pack.priceHT * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
            }
            console.warn('Pack not found for ID:', item.packId);
        } else { // It's a webinar
            const webinarDetails = webinars.find(w => w._id === (item.webinarId || item.id));
            if (webinarDetails) {
                if (webinarDetails.group === WebinarGroup.MASTER_CLASS) {
                    const mcBasePrice = item.price || webinarDetails.price || 0; // MC prices are HT
                    return total + (mcBasePrice * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;
                } else if (webinarDetails.group === WebinarGroup.CROP_TUNIS) {
                    return total + WEBINAR_PRICE; // CROP prices are 80.000 TTC
                }
            } else {
                console.warn('Webinar details not found for item:', item.id);
            }
        }
        return total;
    }, 0);
  }, [cartItems, webinars]); // Added webinars to dependency array

  const handleCheckout = async () => {
    if (!token) {
        alert('Vous devez être connecté pour passer une commande.');
        navigate('/login', { state: { from: '/cart' } });
        return;
    }

    setIsCreatingOrder(true);
    setError(null);

    try {
        const response = await fetch('/api/orders/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ items: cartItems }),
        });

        if (!response.ok) {
            throw new Error('Failed to create order.');
        }

        const { orderId } = await response.json();
        clearCart();
        navigate(`/checkout/${orderId}`);

    } catch (err: any) {
        setError(err.message);
        alert(`Erreur lors de la création de la commande: ${err.message}`);
    } finally {
        setIsCreatingOrder(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (error && !isCreatingOrder) {
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Votre panier est vide</h1>
        <p className="text-slate-600 mb-6">Vous n'avez pas encore ajouté de formation à votre panier.</p>
        <Link to="/webinars" className="bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
          Découvrir nos formations
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-100 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">Votre Panier</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Cart Items */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
            <ul className="divide-y divide-slate-200">
              {cartItems.map((item, index) => {
                const isPack = item.type === ProductType.PACK || !!item.packId;

                // Render Pack Item
                if (isPack && item.packId) {
                    const pack = MASTER_CLASS_PACKS.find(p => p.id === item.packId);
                    if (!pack) return null;
                    const priceTTC = (pack.priceHT * (1 + TAX_RATES.TVA)) + TAX_RATES.TIMBRE;

                    return (
                        <li key={`${item.id}-${index}`} className="p-4 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 bg-teal-50/50">
                             <div className="h-24 w-24 flex items-center justify-center bg-teal-100 rounded-md text-teal-600 font-bold text-xl">
                                {pack.id}
                             </div>
                             <div className="flex-grow">
                                <h2 className="font-semibold text-slate-800">{pack.name}</h2>
                                <p className="text-sm text-slate-500">{pack.credits} Crédits Master Class</p>
                                <p className="text-xs text-slate-400 mt-1">{pack.description}</p>
                             </div>
                             <div className="text-right self-center">
                                <p className="font-bold text-lg text-teal-600 mb-2">{priceTTC.toFixed(3)} TND</p>
                                <p className="text-xs text-slate-400 mb-2">TTC</p>
                                <button onClick={() => removeFromCart(item.id)} className="text-sm text-red-500 hover:text-red-700 flex items-center justify-end w-full">
                                    <TrashIcon className="h-4 w-4 mr-1" />
                                    Supprimer
                                </button>
                             </div>
                        </li>
                    );
                } 
                // Render Webinar Item (Default)
                else {
                    const webinarId = item.webinarId || item.id;
                    const webinar = webinars.find(w => w._id === webinarId);
                    
                    // Fallback UI while loading specific webinar details or if missing
                    if (!webinar) return (
                        <li key={`${item.id}-${index}`} className="p-4 flex items-center justify-center text-slate-400">
                            Chargement des détails...
                        </li>
                    );
                    
                    return (
                        <li key={`${item.id}-${index}`} className="p-4 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                            <img src={webinar.imageUrl || 'https://via.placeholder.com/150'} alt={webinar.title} className="h-24 w-24 object-cover rounded-md" />
                            <div className="flex-grow">
                                <h2 className="font-semibold text-slate-800">{webinar.title}</h2>
                                <p className="text-sm text-slate-500">Par {webinar.presenter}</p>
                                <div className="mt-2">
                                    <h4 className="text-xs font-bold text-slate-600 uppercase">Créneaux choisis :</h4>
                                    {item.slots && item.slots.length > 0 ? (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {item.slots.map(slot => (
                                                <span key={slot} className="text-xs font-medium bg-teal-100 text-teal-800 px-2 py-1 rounded-full">{slot}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-red-500">Aucun créneau sélectionné !</p>
                                    )}
                                </div>
                            </div>
                            <div className="text-right self-center">
                                {webinar && ( // Ensure webinar details are loaded before showing price
                                    <p className="font-bold text-lg text-teal-600 mb-2">
                                        {webinar.group === WebinarGroup.MASTER_CLASS
                                            ? ((item.price || webinar.price || 0) * (1 + TAX_RATES.TVA) + TAX_RATES.TIMBRE).toFixed(3)
                                            : WEBINAR_PRICE.toFixed(3) // CROP Tunis is fixed WEBINAR_PRICE
                                        } TND <span className="text-sm">(TTC)</span>
                                    </p>
                                )}
                                <button onClick={() => navigate(`/webinars/${webinar._id}`)} className="text-sm text-blue-500 hover:text-blue-700 mb-2 flex items-center justify-end w-full">
                                    <EditIcon className="h-4 w-4 mr-1" />
                                    Modifier
                                </button>
                                <button onClick={() => removeFromCart(item.id)} className="text-sm text-red-500 hover:text-red-700 flex items-center justify-end w-full">
                                    <TrashIcon className="h-4 w-4 mr-1" />
                                    Supprimer
                                </button>
                            </div>
                        </li>
                    );
                }
              })}
            </ul>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-4 mb-4">Résumé de la commande</h2>
              <div className="space-y-2">
                <div className="flex justify-between font-bold text-lg pt-2">
                  <span>Total (TTC)</span>
                  <span>{totalPrice.toFixed(3)} TND</span>
                </div>
                <p className="text-xs text-slate-400 text-right mt-1">* TVA et Timbre inclus pour les Packs</p>
              </div>
              <div className="mt-6">
                <button 
                  onClick={handleCheckout}
                  disabled={isCreatingOrder}
                  className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors disabled:bg-teal-400 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isCreatingOrder ? <Spinner className="h-5 w-5" /> : 'Procéder au paiement'}
                </button>
                <Link to="/webinars" className="w-full mt-4 text-center text-teal-600 font-semibold py-2 px-4 rounded-lg hover:bg-teal-50 transition-colors block">
                  Continuer vos achats
                </Link>
                <button 
                  onClick={clearCart} 
                  className="w-full mt-4 text-sm text-slate-600 hover:text-red-500"
                >
                  Vider le panier
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CartPage;