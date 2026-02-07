import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Webinar,
  WebinarTimeSlot,
  WebinarGroup,
  ProductType,
} from '../types';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../context/CartContext';

const AddToCartForm: React.FC<{
  webinar: Webinar; // Added webinar prop
  initialSelectedSlots?: WebinarTimeSlot[]; // For already registered users
  onUpdateRegistration?: (newSlots: WebinarTimeSlot[]) => Promise<void>; // For registered users
  userMasterClassCredits?: number; // New prop for Master Class credit logic
  onUseCredit?: (webinarId: string) => Promise<void>; // New prop for Master Class credit registration
  isAdded: boolean; // Prop received from parent
  setIsAdded: React.Dispatch<React.SetStateAction<boolean>>; // Prop received from parent
}> = ({
  webinar,
  initialSelectedSlots,
  onUpdateRegistration,
  userMasterClassCredits = 0,
  onUseCredit,
  isAdded,
  setIsAdded,
}) => {
  const { addToCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const isMasterClass = webinar.group === WebinarGroup.MASTER_CLASS;
  const isFree = webinar.price === 0;
  const [selectedSlots, setSelectedSlots] = useState<WebinarTimeSlot[]>(
    initialSelectedSlots || [],
  );
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine if we are in "update registration" mode
  const isUpdateMode = !!onUpdateRegistration;

  // Check if the webinar date has passed
  const now = new Date();
  const webinarDateTime = new Date(webinar.date);
  let isPastWebinar = webinarDateTime < now;

  if (webinar.group === WebinarGroup.PHARMIA) {
    const fridayDate = new Date(webinarDateTime);
    fridayDate.setDate(webinarDateTime.getDate() + 3);
    // Extend validity until the end of the Friday replay day
    fridayDate.setHours(23, 59, 59, 999);
    isPastWebinar = fridayDate < now;
  }

  const handleCheckboxChange = (slot: WebinarTimeSlot) => {
    setSelectedSlots((prev) => {
      const newSlots = prev.includes(slot)
        ? prev.filter((s) => s !== slot)
        : [...prev, slot];

      if (!isUpdateMode && isAdded && !isFree) {
        addToCart({
          webinar: webinar,
          type: ProductType.WEBINAR,
          selectedSlots: newSlots,
        });
      }
      return newSlots;
    });
  };

  const { login } = useAuth(); // Assuming useAuth exposes login
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const handleAddToCart = async () => {
    if (!isMasterClass && !isFree && selectedSlots.length === 0) {
      alert('Veuillez sélectionner au moins un créneau.');
      return;
    }
    
    addToCart({
      webinar: webinar,
      type: ProductType.WEBINAR,
      selectedSlots: selectedSlots,
    });
    setIsAdded(true);
  };
  
  const handleFreeRegistration = async () => {
     // Public Registration Flow
     if (!token) {
      if (!firstName || !lastName || !email || !phone) {
        alert("Tous les champs sont obligatoires pour l'inscription.");
        return;
      }

      setIsSubmitting(true);
      try {
        const slotsToSubmit =
          selectedSlots.length > 0
            ? selectedSlots
            : [WebinarTimeSlot.MORNING];

        const response = await fetch(
          `/api/webinars/${webinar._id}/public-register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName,
              lastName,
              email,
              phone,
              timeSlots: slotsToSubmit,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok) {
          if (data.code === 'USER_EXISTS') {
            if (
              window.confirm(
                data.message + ' Voulez-vous aller à la page de connexion ?',
              )
            ) {
              navigate('/login', {
                state: { from: `/webinars/${webinar._id}` },
              });
            }
          } else {
            throw new Error(data.message || "Erreur lors de l'inscription");
          }
          return;
        }

        // Auto-login
        if (data.token && login) {
          login(data.token, data.user); // Assuming login takes token and user object
          alert(
            'Votre compte a été créé et votre inscription est validée ! Un email contenant le lien de la formation vient de vous être envoyé.',
          );
          window.location.reload();
        } else {
          alert(
            'Votre inscription est validée ! Un email contenant le lien de la formation vient de vous être envoyé. Veuillez vous connecter pour accéder à votre espace.',
          );
          navigate('/login');
        }
      } catch (err: any) {
        alert(err.message);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Authenticated Free Flow (Existing logic)
    if (!phone || phone.length < 8) {
      alert(
        'Veuillez renseigner un numéro de téléphone valide pour valider votre inscription gratuite.',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Update phone number if it's new
      if (phone !== user?.phoneNumber) {
        await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ phoneNumber: phone }),
        });
      }

      // For free webinars, we use a default slot since the time is fixed by the date
      const slotsToSubmit =
        selectedSlots.length > 0 ? selectedSlots : [WebinarTimeSlot.MORNING];

      const response = await fetch(`/api/webinars/${webinar._id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ timeSlots: slotsToSubmit }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Erreur lors de l'inscription");
      }

      alert(
        'Votre inscription est validée ! Un email contenant le lien de la formation vient de vous être envoyé.',
      );
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleGoToCart = () => {
    navigate('/cart');
  };

  if (isPastWebinar && !isUpdateMode) {
    return (
      <div className="text-center text-red-600 font-semibold mt-4">
        Ce webinaire est passé. L'inscription n'est plus possible.
      </div>
    );
  }

  // Rendu pour les Master Class
  if (isMasterClass && !isUpdateMode) {
    return (
      <div className="mt-6 space-y-4">
        <div className="text-center text-slate-700 font-semibold mb-4">
          Choisissez votre mode de paiement.
        </div>
        
        {userMasterClassCredits > 0 && onUseCredit && (
          <div>
            <button
              onClick={() => onUseCredit(webinar._id as string)}
              className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700"
            >
              Utiliser 1 crédit Master Class
            </button>
            <p className="text-center text-sm text-slate-500 mt-2">
              Vous avez {userMasterClassCredits} crédit(s) disponible(s).
            </p>
          </div>
        )}
        
        {isAdded ? (
           <button
           onClick={handleGoToCart}
           className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-orange-500 text-white hover:bg-orange-600"
         >
           Ajouté au panier (Voir le panier)
         </button>
        ) : (
          <button
            onClick={handleAddToCart}
            className="w-full font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-white text-teal-700 border border-teal-700 hover:bg-teal-50"
          >
            Ajouter au panier ({webinar.price.toFixed(2)} DT HT)
          </button>
        )}
      </div>
    );
  }
    return (
      <div>
        {!isMasterClass && !isFree && !isUpdateMode && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Choisissez vos créneaux de participation :
            </h3>
            <div className="space-y-3">
                            {(() => {
                              if (webinar.group === WebinarGroup.PHARMIA) {
                                return [
                                  WebinarTimeSlot.PHARMIA_TUESDAY,
                                  WebinarTimeSlot.PHARMIA_FRIDAY,
                                ];
                              } else if (webinar.group === WebinarGroup.CROP_TUNIS) {
                                return [
                                  WebinarTimeSlot.MORNING,
                                  WebinarTimeSlot.AFTERNOON,
                                  WebinarTimeSlot.EVENING,
                                ];
                              } else {
                                return []; // No default slots for other groups to avoid confusion
                              }
                            })().map((slot) => (
                <label
                  key={slot}
                  className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all hover:border-teal-500 hover:shadow-sm"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded-full border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={selectedSlots.includes(slot)}
                    onChange={() => handleCheckboxChange(slot)}
                  />
                  <span className="ml-4 text-md font-medium text-slate-800">
                    {slot}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!isMasterClass && isFree && !isUpdateMode && (
        <div className="bg-white p-4 rounded-lg border border-teal-100 shadow-sm mb-4">
          {/* ... (formulaire d'inscription gratuite) ... */}
        </div>
      )}
      
      {isUpdateMode ? (
        <button onClick={() => onUpdateRegistration && onUpdateRegistration(selectedSlots)} className="w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-blue-600 text-white hover:bg-blue-700">Modifier les créneaux</button>
      ) : isFree ? (
        <button onClick={handleFreeRegistration} disabled={isSubmitting} className="w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700">{isSubmitting ? "Traitement..." : "M'inscrire gratuitement"}</button>
      ) : isAdded ? (
        <button onClick={handleGoToCart} className="w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-orange-500 text-white hover:bg-orange-600">Ajouté (Voir le panier)</button>
      ) : (
        <button onClick={handleAddToCart} disabled={!isFree && selectedSlots.length === 0} className="w-full mt-4 font-bold py-3 px-6 rounded-lg shadow-md transition-colors bg-teal-600 text-white hover:bg-teal-700 disabled:bg-gray-400">Ajouter au panier</button>
      )}

      {isAdded && !isUpdateMode && !isFree && (
        <button
          onClick={() => navigate('/webinars')}
          className="w-full mt-2 text-center text-teal-600 font-semibold py-2 px-4 rounded-lg hover:bg-teal-50 transition-colors"
        >
          Continuer à choisir un autre wébinaire
        </button>
      )}
    </div>
  );
};

export default AddToCartForm;
