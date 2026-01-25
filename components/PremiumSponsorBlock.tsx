import React from 'react';
import { AdCampaign } from '../types';
import getAbsoluteImageUrl from '../utils/image';

interface PremiumSponsorBlockProps {
  campaign: AdCampaign;
}

const PremiumSponsorBlock: React.FC<PremiumSponsorBlockProps> = ({
  campaign,
}) => {
  return (
    <div className="mt-8 bg-white rounded-xl overflow-hidden shadow-lg border border-teal-100 transition-all duration-300 hover:shadow-xl">
      {/* Header / Banner */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-5 py-2 flex justify-between items-center">
        <span className="text-white font-bold tracking-wide text-[11px] flex items-center">
          <svg
            className="w-3.5 h-3.5 mr-1.5 text-yellow-300"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          PARTENAIRE PREMIUM
        </span>
        <span className="text-teal-100 text-[10px] font-semibold uppercase">
          {campaign.sponsorName}
        </span>
      </div>

      <div className="p-5">
        {/* Product Image Focus */}
        {campaign.imageUrl && (
          <div className="mb-4 flex justify-center bg-slate-50 rounded-lg p-3 border border-slate-100">
            <img
              src={getAbsoluteImageUrl(campaign.imageUrl)}
              alt={campaign.productName}
              className="h-40 w-full object-contain mix-blend-multiply"
            />
          </div>
        )}

        {/* Text Content */}
        <h3 className="text-lg font-bold text-slate-800 mb-1.5 leading-tight">
          {campaign.productName}
        </h3>

        <p className="text-[13px] text-slate-600 mb-5 leading-relaxed">
          {campaign.description}
        </p>

        {/* CTA */}
        <a
          href={campaign.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-[#0B8278] text-white font-bold py-2.5 px-4 rounded-lg text-sm hover:bg-teal-700 transition-colors shadow-sm hover:shadow-md transform active:scale-95"
        >
          Découvrir le produit
        </a>
      </div>
    </div>
  );
};

export default PremiumSponsorBlock;
