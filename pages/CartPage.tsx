
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../hooks/useAuth'; // Import useAuth
import { Webinar } from '../types';
import { Spinner, TrashIcon, EditIcon } from '../components/Icons';
import { WEBINAR_PRICE } from '../constants';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const { token } = useAuth(); // Get auth token
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchWebinarDetails = async () => {
      if (cartItems.length === 0) {
        setWebinars([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const webinarIds = cartItems.map(item => item.webinarId);
        const response = await fetch('/api/webinars/by-ids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: webinarIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch webinar details.');
        }

        const data: Webinar[] = await response.json();
        // Ensure the order of webinars matches the order in the cart
        const sortedData = webinarIds.map(id => data.find(w => w._id === id)).filter(Boolean) as Webinar[];
        setWebinars(sortedData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWebinarDetails();
  }, [cartItems]);

  const totalPrice = useMemo(() => {
    return cartItems.length * WEBINAR_PRICE;
  }, [cartItems]);

  const handleCheckout = async () => {
    if (!token) {
        alert('Vous devez être connecté pour passer une commande.');
        navigate('/login');
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
            body: JSON.stringify({ items: cartItems }), // Send the full cart items array
        });

        if (!response.ok) {
            throw new Error('Failed to create order.');
        }

        const { orderId } = await response.json();
        clearCart(); // Clear cart after order is successfully created
        navigate(`/checkout/${orderId}`); // Redirect to the new checkout page

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

  if (error && !isCreatingOrder) { // Don't show page-level error if it's an order creation error
    return <div className="text-center text-red-500 py-10">{error}</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Votre panier est vide</h1>
        <p className="text-slate-600 mb-6">Vous n'avez pas encore ajouté de webinaire à votre panier.</p>
        <Link to="/webinars" className="bg-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-md hover:bg-teal-700 transition-colors">
          Découvrir nos webinaires
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
              {webinars.map(webinar => {
                const cartItem = cartItems.find(item => item.webinarId === webinar._id);
                return (
                    <li key={webinar._id as string} className="p-4 flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <img src={webinar.imageUrl || 'https://via.placeholder.com/150'} alt={webinar.title} className="h-24 w-24 object-cover rounded-md" />
                        <div className="flex-grow">
                            <h2 className="font-semibold text-slate-800">{webinar.title}</h2>
                            <p className="text-sm text-slate-500">Par {webinar.presenter}</p>
                            <div className="mt-2">
                                <h4 className="text-xs font-bold text-slate-600 uppercase">Créneaux choisis :</h4>
                                {cartItem?.slots && cartItem.slots.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {cartItem.slots.map(slot => (
                                            <span key={slot} className="text-xs font-medium bg-teal-100 text-teal-800 px-2 py-1 rounded-full">{slot}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-red-500">Aucun créneau sélectionné !</p>
                                )}
                            </div>
                        </div>
                        <div className="text-right self-center">
                            <p className="font-bold text-lg text-teal-600 mb-2">{WEBINAR_PRICE.toFixed(3)} TND</p>
                            <button onClick={() => navigate(`/webinars/${webinar._id}`)} className="text-sm text-blue-500 hover:text-blue-700 mb-2 flex items-center justify-end w-full">
                                <EditIcon className="h-4 w-4 mr-1" />
                                Modifier
                            </button>
                            <button onClick={() => removeFromCart(webinar._id as string)} className="text-sm text-red-500 hover:text-red-700 flex items-center justify-end w-full">
                                <TrashIcon className="h-4 w-4 mr-1" />
                                Supprimer
                            </button>
                        </div>
                    </li>
                );
              })}
            </ul>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 border-b pb-4 mb-4">Résumé de la commande</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Sous-total</span>
                  <span>{totalPrice.toFixed(3)} TND</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-4 mt-4">
                  <span>Total</span>
                  <span>{totalPrice.toFixed(3)} TND</span>
                </div>
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
                  Continuer à choisir un autre wébinaire
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
