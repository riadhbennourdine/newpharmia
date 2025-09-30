import React from 'react';
import { DetailedMemoFicheView } from './MemoFicheView';
import { MEMOFICHES } from '../constants';

const MemoFichePreview: React.FC = () => {
    // We'll just display the first memo fiche from our constants as a preview
    const memoFicheToPreview = MEMOFICHES[0];

    return (
        <div className="bg-slate-100 py-8">
            <h1 className="text-3xl font-bold text-center text-slate-800 mb-8">Aperçu d'une Mémofiche</h1>
            {/* FIX: Corrected prop name from `memoFiche` to `caseStudy` to match the `DetailedMemoFicheViewProps` interface. */}
            <DetailedMemoFicheView caseStudy={memoFicheToPreview} isPreview={true} />
        </div>
    );
};

export default MemoFichePreview;