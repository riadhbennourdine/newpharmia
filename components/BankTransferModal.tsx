import React from 'react';

interface BankTransferModalProps {
  onClose: () => void;
}

const BankTransferModal: React.FC<BankTransferModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full mx-4">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Paiement par virement bancaire</h3>
        <div className="text-gray-700 space-y-4">
            <p>Veuillez effectuer un virement bancaire aux coordonnées suivantes :</p>
            <div className="p-4 bg-gray-100 rounded-md">
                <p><strong>Banque :</strong> Banque Internationale Arabe de Tunisie (BIAT)</p>
                <p><strong>IBAN :</strong> TN59 0800 8001 2345 6789 012 34</p>
                <p><strong>BIC/SWIFT :</strong> BIATTNTT</p>
                <p><strong>Bénéficiaire :</strong> PHARMIA FORMATION</p>
            </div>
            <p>Veuillez inclure votre adresse e-mail dans le libellé du virement.</p>
            <p>Une fois le virement effectué, veuillez nous envoyer une preuve de paiement à <a href="mailto:contact@pharmia.com" className="text-teal-600 hover:underline">contact@pharmia.com</a>.</p>
            <p>Votre abonnement sera activé manuellement après confirmation de la réception des fonds.</p>
        </div>
        <div className="flex justify-end mt-8">
            <button
                onClick={onClose}
                className="px-6 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors duration-200"
            >
                Fermer
            </button>
        </div>
      </div>
    </div>
  );
};

export default BankTransferModal;
