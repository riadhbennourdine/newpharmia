import React from 'react';

interface PaymentMethodModalProps {
  onSelect: (method: 'card' | 'transfer') => void;
  onCancel: () => void;
}

const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({ onSelect, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Choisir la méthode de paiement</h3>
        <div className="flex flex-col space-y-4 mt-8">
          <button
            onClick={() => onSelect('card')}
            className="px-6 py-3 bg-teal-600 text-white rounded-md text-lg font-medium hover:bg-teal-700 transition-colors duration-200"
          >
            Paiement par carte
          </button>
          <button
            onClick={() => onSelect('transfer')}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md text-lg font-medium hover:bg-gray-300 transition-colors duration-200"
          >
            Paiement par virement bancaire
          </button>
        </div>
        <div className="flex justify-end mt-8">
            <button
                onClick={onCancel}
                className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
                Annuler
            </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodModal;
