import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
  return (
    <div className="container mx-auto p-8 text-center">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <h2 className="text-3xl font-bold mt-4">Page non trouvée</h2>
      <p className="mt-4 text-gray-600">
        Désolé, la page que vous recherchez n'existe pas.
      </p>
      <Link to="/" className="mt-8 btn btn-primary">
        Retour à l'accueil
      </Link>
    </div>
  );
};

export default NotFoundPage;
