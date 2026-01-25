import React from 'react';
import { Link } from 'react-router-dom';

const ThankYouPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full text-center p-8 bg-white shadow-lg rounded-lg">
        <svg
          className="mx-auto h-16 w-16 text-teal-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900">
          Merci pour votre retour !
        </h1>
        <p className="mt-2 text-base text-gray-500">
          Votre avis est très important pour nous et nous aidera à améliorer
          PharmIA.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
