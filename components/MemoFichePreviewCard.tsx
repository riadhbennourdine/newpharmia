import React from 'react';
import { Link } from 'react-router-dom';
import { CaseStudy } from '../types';
import getAbsoluteImageUrl from '../utils/image';

const MemoFichePreviewCard: React.FC<{ caseStudy: CaseStudy }> = ({
  caseStudy,
}) => (
  <Link
    to={`/memofiche/${caseStudy._id}`}
    className="group bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden block"
  >
    <div className="relative">
      <img
        src={getAbsoluteImageUrl(
          caseStudy.coverImageUrl ||
            'https://images.unsplash.com/photo-1516542076529-1ea3854896f2?q=80&w=800&auto=format&fit=crop',
        )}
        alt={caseStudy.title}
        className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    </div>
    <div className="p-4">
      <h3 className="text-md font-bold text-slate-800 group-hover:text-teal-700 truncate">
        {caseStudy.title}
      </h3>
      <p className="text-xs text-slate-500 mt-1">{caseStudy.theme}</p>
    </div>
  </Link>
);

export default MemoFichePreviewCard;
