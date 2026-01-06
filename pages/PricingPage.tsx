import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import PricingConfirmationModal from '../components/PricingConfirmationModal';
import PaymentMethodModal from '../components/PaymentMethodModal';
import BankTransferModal from '../components/BankTransferModal';

type BillingCycle = 'monthly' | 'quarterly' | 'annual';

interface SelectedPlanDetails {
  planName: string;
  basePrice: number;
  billingCycle: BillingCycle;
}

const PricingPage: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<SelectedPlanDetails | null>(null);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);

  const pricing = {
    solo: {
      name: 'Solo',
      description: 'Licence unique Pharmacien',
      monthly: 29.900,
      quarterly: 79.900, // Discounted from 89.700
      annual: 269.100, // 29.900 * 9
      features: [
        'Accès complet aux mémofiches',
        'Mises à jour régulières',
        'Support standard'
      ],
      popular: false,
    },
    starter: {
      name: 'Starter',
      description: 'Pharmacien + 5 licences Préparateurs',
      monthly: 79.900,
      quarterly: 214.900, // Discounted from 239.700
      annual: 719.100, // 79.900 * 9
      features: [
        'Toutes les fonctionnalités Solo',
        '5 comptes Préparateurs inclus',
        'Gestion d\'équipe simplifiée',
        'Support prioritaire'
      ],
      popular: true
    },
    gold: {
      name: 'Gold',
      description: 'Pharmacien + 10 licences Préparateurs',
      monthly: 108.900,
      quarterly: 294.900, // Discounted from 326.700
      annual: 980.100, // 108.900 * 9
      features: [
        'Toutes les fonctionnalités Starter',
        '10 comptes Préparateurs inclus',
        'Rapports d\'activité détaillés',
        'Formation personnalisée'
      ],
      popular: false,
    }
  };

  const handleChoosePlan = (planName: string, basePrice: number) => {
    if (!isAuthenticated) {
      setError('Veuillez vous connecter pour choisir un plan.');
      return;
    }
    setSelectedPlanDetails({ planName, basePrice, billingCycle });
    setShowPaymentMethodModal(true);
  };

  const handlePaymentMethodSelect = (method: 'card' | 'transfer') => {
    setShowPaymentMethodModal(false);
    if (method === 'card') {
      setShowConfirmationModal(true);
    } else {
      setShowBankTransferModal(true);
    }
  };

  const confirmAndInitiatePayment = async (totalAmount: number) => {
    if (!selectedPlanDetails || !user) return;

    const { planName, billingCycle } = selectedPlanDetails;

    setLoadingPlan(planName);
    setError(null);
    setShowConfirmationModal(false);

    let cycleLabel = 'Mensuel';
    if (billingCycle === 'quarterly') cycleLabel = 'Trimestriel';
    if (billingCycle === 'annual') cycleLabel = 'Annuel';

    try {
      const response = await fetch('/api/gpg/initiate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          planName: planName,
          isAnnual: billingCycle === 'annual', // Kept for compatibility, but description overrides
          description: `Abonnement ${planName} (${cycleLabel})`,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          orderId: user._id,
          city: user.city,
          country: 'Tunisie',
          zip: user.zipCode,
        }),
      });

      const paymentData = await response.json();

      if (!response.ok) {
        throw new Error(paymentData.message || 'Failed to initiate GPG payment.');
      }

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = paymentData.paymentUrl;

      Object.keys(paymentData).forEach(key => {
        if (key !== 'paymentUrl') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = paymentData[key];
          form.appendChild(input);
        }
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      console.error('Error initiating GPG payment:', err);
      setError(err.message || 'Une erreur est survenue lors de l\'initialisation du paiement.');
    } finally {
      setLoadingPlan(null);
      setSelectedPlanDetails(null);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-10">Nos Formules d'Abonnement</h1>

      <div className="flex justify-center mb-8">
        <div className="relative p-1 bg-gray-200 rounded-full flex">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${billingCycle === 'monthly' ? 'bg-teal-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Mensuel
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${billingCycle === 'quarterly' ? 'bg-teal-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setBillingCycle('quarterly')}
          >
            Trimestriel (-10%)
          </button>
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${billingCycle === 'annual' ? 'bg-teal-600 text-white shadow' : 'text-gray-700 hover:bg-gray-300'}`}
            onClick={() => setBillingCycle('annual')}
          >
            Annuel (-3 mois)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {Object.values(pricing).map((plan) => {
            let price = plan.monthly;
            let label = '/ mois';
            if (billingCycle === 'quarterly') {
                price = plan.quarterly;
                label = '/ trimestre';
            } else if (billingCycle === 'annual') {
                price = plan.annual;
                label = '/ an';
            }

            return (
              <div
                key={plan.name}
                className={`bg-white rounded-xl shadow-lg p-8 flex flex-col border-2 ${plan.popular ? 'border-teal-600 scale-105' : 'border-gray-200'} transition-all duration-300`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-teal-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-xl">
                    Le plus populaire
                  </div>
                )}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h2>
                <p className="text-gray-500 mb-6">{plan.description}</p>
                <div className="text-4xl font-extrabold text-teal-600 mb-4">
                  {price.toFixed(3)} DT
                  <span className="text-lg font-medium text-gray-500"> {label} HT</span>
                </div>
                <ul className="text-gray-700 space-y-3 flex-grow">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      <svg className="w-5 h-5 text-teal-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleChoosePlan(plan.name, price)}
                  className={`mt-8 block text-center py-3 rounded-lg font-semibold transition-colors duration-300 ${plan.popular ? 'bg-teal-600 text-white hover:bg-green-700' : 'bg-gray-100 text-teal-600 hover:bg-gray-200'} ${
                    loadingPlan === plan.name ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={loadingPlan === plan.name}
                >
                  {loadingPlan === plan.name ? 'Chargement...' : `Choisir ${plan.name}`}
                </button>
              </div>
            );
        })}
      </div>

      {showPaymentMethodModal && (
        <PaymentMethodModal
          onSelect={handlePaymentMethodSelect}
          onCancel={() => {
            setShowPaymentMethodModal(false);
            setSelectedPlanDetails(null);
          }}
        />
      )}

      {showBankTransferModal && selectedPlanDetails && (
        <BankTransferModal
          onClose={() => {
            setShowBankTransferModal(false);
            setSelectedPlanDetails(null);
          }}
          planName={selectedPlanDetails.planName}
          basePrice={selectedPlanDetails.basePrice}
          isAnnual={selectedPlanDetails.billingCycle === 'annual'}
        />
      )}

      {showConfirmationModal && selectedPlanDetails && (
        <PricingConfirmationModal
          planName={selectedPlanDetails.planName}
          basePrice={selectedPlanDetails.basePrice}
          isAnnual={selectedPlanDetails.billingCycle === 'annual'}
          onConfirm={confirmAndInitiatePayment}
          onCancel={() => {
            setShowConfirmationModal(false);
            setSelectedPlanDetails(null);
          }}
        />
      )}
    </div>
  );
};

export default PricingPage;