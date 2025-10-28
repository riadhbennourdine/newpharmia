import React from 'react';
import { Link } from 'react-router-dom';

interface BankTransferModalProps {
  onClose: () => void;
}

const BankTransferModal: React.FC<BankTransferModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full mx-4 overflow-y-auto max-h-[80vh]">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Paiement par virement bancaire</h3>
        <div className="text-gray-700 space-y-4">
            <p>Veuillez effectuer un virement bancaire aux coordonnées suivantes :</p>
            <div className="p-4 bg-gray-100 rounded-md">
                <p><strong>Banque :</strong> Banque Nationale Agricole (BNA)</p>
                <p><strong>RIB :</strong> 03 027 1570115004362 83</p>
                <p><strong>IBAN :</strong> TN 59 03 027 157 0115 004362 83</p>
                <p><strong>Domiciliation :</strong> BOUMHEL ELBASSATINE</p>
                <p><strong>Bénéficiaire :</strong> PHARMACONSEIL BMB</p>
            </div>
            <p>Veuillez inclure votre adresse e-mail dans le libellé du virement.</p>
            <p>Une fois le virement effectué, veuillez nous envoyer une preuve de paiement à <a href="mailto:rbpharskillseed@gmail.com" className="text-teal-600 hover:underline">rbpharskillseed@gmail.com</a>.</p>
            <p>Votre abonnement sera activé manuellement après confirmation de la réception des fonds.</p>
        </div>
        <div className="flex justify-end mt-8 space-x-4">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors duration-200"
            >
                Fermer
            </button>
            <Link to="/contact">
                <button
                    className="px-6 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors duration-200"
                >
                    Envoyer la preuve de paiement
                </button>
            </Link>
        </div>
        <div className="mt-4 image-zoom-container">
            <img src="https://pharmaconseilbmb.com/photos/site/rib-bna.png" alt="RIB BNA" className="w-full zoom-on-hover" />
        </div>
      </div>
    </div>
  );
};

export default BankTransferModal;
