
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { Webinar } from '../types';
import { Spinner, TrashIcon } from '../components/Icons';

const CartPage: React.FC = () => {
  const { cartItems, removeFromCart, clearCart } = useCart();
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
        const response = await fetch('/api/webinars/by-ids', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: cartItems }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch webinar details.');
        }

        const data: Webinar[] = await response.json();
        // Ensure the order of webinars matches the order in the cart
        const sortedData = cartItems.map(id => data.find(w => w._id === id)).filter(Boolean) as Webinar[];
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
    return webinars.reduce((total, webinar) => total + (webinar.price || 0), 0);
  }, [webinars]);

  const handleCheckout = () => {
    // Later, this will navigate to a checkout page
    console.log('Proceeding to checkout with items:', webinars);
    alert('La page de paiement n\'est pas encore implémentée.');
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (error) {
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
              {webinars.map(webinar => (
                <li key={webinar._id as string} className="p-4 flex items-center space-x-4">
                  <img src={webinar.imageUrl || 'https://via.placeholder.com/150'} alt={webinar.title} className="h-20 w-20 object-cover rounded-md hidden sm:block" />
                  <div className="flex-grow">
                    <h2 className="font-semibold text-slate-800">{webinar.title}</h2>
                    <p className="text-sm text-slate-500">Par {webinar.presenter}</p>
                    <p className="text-sm text-slate-500">{new Date(webinar.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-teal-600">{webinar.price?.toFixed(3) || '0.000'} TND</p>
                    <button onClick={() => removeFromCart(webinar._id as string)} className="text-sm text-red-500 hover:text-red-700 mt-1">
                      <TrashIcon className="h-5 w-5 inline-block mr-1" />
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
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
                  className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:bg-teal-700 transition-colors"
                >
                  Procéder au paiement
                </button>
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
