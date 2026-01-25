import React from 'react';
import { Link } from 'react-router-dom';

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="container mx-auto p-8 text-center">
    <h1 className="text-4xl font-bold">{title}</h1>
    <p className="mt-4 text-gray-600">
      Cette page est en cours de construction.
    </p>
    <Link to="/dashboard" className="mt-6 btn btn-primary">
      Retour au tableau de bord
    </Link>
  </div>
);

export default PlaceholderPage;
