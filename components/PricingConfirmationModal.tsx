import React from 'react';

interface PricingConfirmationModalProps {
  planName: string;
  basePrice: number;
  isAnnual: boolean;
  onConfirm: (totalAmount: number) => void;
  onCancel: () => void;
}

const VAT_RATE = 0.19; // 19%
const FIXED_TAX = 1.000; // 1.000 TND

const PricingConfirmationModal: React.FC<PricingConfirmationModalProps> = ({
  planName,
  basePrice,
  isAnnual,
  onConfirm,
  onCancel,
}) => {
  const vatAmount = basePrice * VAT_RATE;
  const priceTTC = basePrice + vatAmount;
  const totalAmount = priceTTC + FIXED_TAX;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4 animate-fade-in-up">
        <h3 className="text-2xl font-bold mb-4 text-gray-800">Confirmation de l'Abonnement</h3>
        <p className="text-gray-700 mb-2">Vous avez choisi le plan <span className="font-semibold">{planName}</span> ({isAnnual ? 'Annuel' : 'Mensuel'}).</p>

        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Prix HT:</span>
            <span className="font-medium">{basePrice.toFixed(3)} DT</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">TVA (19%):</span>
            <span className="font-medium">{vatAmount.toFixed(3)} DT</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-600">Prix TTC:</span>
            <span className="font-medium">{priceTTC.toFixed(3)} DT</span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-200 mt-2 pt-2">
            <span className="text-gray-600">Taxe fixe:</span>
            <span className="font-medium">{FIXED_TAX.toFixed(3)} DT</span>
          </div>
          <div className="flex justify-between py-1 border-t border-gray-300 mt-4 pt-4 text-lg font-bold text-teal-600">
            <span>Total à payer:</span>
            <span>{totalAmount.toFixed(3)} DT</span>
          </div>
        </div>

        <div className="flex justify-end space-x-4 mt-8">
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-200"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(totalAmount)}
            className="px-6 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors duration-200"
          >
            Confirmer et Payer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingConfirmationModal;
