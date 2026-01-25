import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 text-white mt-8">
      <div className="container mx-auto px-4 py-4 text-center text-sm">
        <p>
          &copy; {new Date().getFullYear()} PharmIA. Apprentissage par l'IA pour
          les professionnels de la pharmacie.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
