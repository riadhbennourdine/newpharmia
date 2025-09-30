import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { CaseStudy } from '../types';
import { Spinner } from '../components/Icons';
import MemoFicheEditor from '../components/MemoFicheEditor';

const MemoFicheEditorPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCaseStudyById, saveCaseStudy } = useData();
    const [caseStudy, setCaseStudy] = useState<CaseStudy | undefined>(undefined);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            setLoading(true);
            getCaseStudyById(id).then(data => {
                setCaseStudy(data);
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
        } else {
            // It's a new case study
            setLoading(false);
        }
    }, [id, getCaseStudyById]);
    
    const handleSave = async (editedCaseStudy: CaseStudy) => {
        try {
            await saveCaseStudy(editedCaseStudy);
            alert('Mémofiche sauvegardée avec succès !');
            navigate('/dashboard');
        } catch(err: any) {
            alert(`Erreur lors de la sauvegarde: ${err.message}`);
        }
    };

    const handleCancel = () => {
        navigate(-1);
    }

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner className="h-10 w-10 text-teal-600" /></div>;
    }
    
    if (id && !caseStudy) {
        return <div className="text-center p-8">Mémofiche non trouvée.</div>;
    }

    return (
        <div className="bg-slate-50 py-8">
            <MemoFicheEditor 
                initialCaseStudy={caseStudy}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        </div>
    );
};

export default MemoFicheEditorPage;