import React from 'react';
import { AdCampaign } from '../types';
import getAbsoluteImageUrl from '../utils/image';

interface PremiumSponsorBlockProps {
    campaign: AdCampaign;
}

const PremiumSponsorBlock: React.FC<PremiumSponsorBlockProps> = ({ campaign }) => {
    return (
        <div className="mt-8 bg-white rounded-xl overflow-hidden shadow-lg border border-indigo-100 transition-all duration-300 hover:shadow-xl">
            {/* Header / Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-3 flex justify-between items-center">
                <span className="text-white font-bold tracking-wide text-sm flex items-center">
                    <svg className="w-4 h-4 mr-2 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    PARTENAIRE PREMIUM
                </span>
                <span className="text-indigo-200 text-xs font-semibold uppercase">{campaign.sponsorName}</span>
            </div>

            <div className="p-6">
                {/* Product Image Focus */}
                {campaign.imageUrl && (
                    <div className="mb-6 flex justify-center bg-slate-50 rounded-lg p-4 border border-slate-100">
                        <img 
                            src={getAbsoluteImageUrl(campaign.imageUrl)} 
                            alt={campaign.productName} 
                            className="h-48 w-full object-contain mix-blend-multiply" 
                        />
                    </div>
                )}

                {/* Text Content */}
                <h3 className="text-xl font-bold text-slate-800 mb-2 leading-tight">
                    {campaign.productName}
                </h3>
                
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                    {campaign.description}
                </p>

                {/* CTA */}
                <a 
                    href={campaign.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg transform active:scale-95"
                >
                    Découvrir le produit
                </a>
            </div>
        </div>
    );
};

export default PremiumSponsorBlock;
