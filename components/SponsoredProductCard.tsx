import React from 'react';

interface SponsoredProductCardProps {
  sponsorName: string;
  productName: string;
  description: string;
  imageUrl?: string;
  link: string;
}

const SponsoredProductCard: React.FC<SponsoredProductCardProps> = ({
  sponsorName,
  productName,
  description,
  imageUrl,
  link
}) => {
  return (
    <div className="my-3 ml-4 p-3 border border-indigo-100 rounded-lg bg-indigo-50/50 hover:bg-indigo-50 transition-colors flex flex-row items-start gap-4 shadow-sm group">
      {/* Image Container */}
      <div className="flex-shrink-0 w-20 h-20 bg-white rounded-md border border-indigo-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={productName} className="w-full h-full object-contain" />
        ) : (
          <div className="text-indigo-200 text-xs text-center p-1">Image Produit</div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700">
            Sponsorisé par {sponsorName}
          </span>
        </div>
        
        <h4 className="text-sm font-bold text-slate-800 leading-tight mb-1 group-hover:text-indigo-700 transition-colors">
          {productName}
        </h4>
        
        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
          {description}
        </p>

        <a 
          href={link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800"
          onClick={(e) => e.stopPropagation()} // Prevent triggering accordion if nested
        >
          En savoir plus
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default SponsoredProductCard;
