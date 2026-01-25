import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const UnsubscribePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isInitialCheckDone, setIsInitialCheckDone] = useState(false);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery && emailFromQuery !== '{{NOM_DESTINATAIRE}}') {
      setEmail(emailFromQuery);
      handleUnsubscribe(emailFromQuery);
    } else {
      setIsInitialCheckDone(true);
    }
  }, [searchParams]);

  const handleUnsubscribe = async (emailToUnsubscribe: string) => {
    try {
      console.log('Unsubscribing (mock):', { email: emailToUnsubscribe });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setMessage(
        `L'adresse ${emailToUnsubscribe} a été désabonnée avec succès (simulation).`,
      );
    } catch (error) {
      setMessage('Impossible de se connecter au serveur (simulation).');
    } finally {
      setIsInitialCheckDone(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setMessage('Veuillez entrer une adresse e-mail.');
      return;
    }
    handleUnsubscribe(email);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Se désabonner</h1>

        {!isInitialCheckDone ? (
          <p className="text-gray-600">Vérification en cours...</p>
        ) : message ? (
          <div>
            <p className="text-gray-700 mb-6">{message}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-gray-600 mb-4">
              Entrez votre adresse e-mail pour vous désabonner de notre
              newsletter.
            </p>
            <div className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
              >
                Se désabonner
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;
