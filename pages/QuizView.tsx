import React from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import QuizView from '../components/QuizView';
import { Spinner } from '../components/Icons';
import { CaseStudy } from '../types';

const QuizPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { getCaseStudyById } = useData();
    const [caseStudy, setCaseStudy] = React.useState<CaseStudy | null | undefined>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        if (id) {
            getCaseStudyById(id).then(data => {
                setCaseStudy(data);
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [id, getCaseStudyById]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner className="h-12 w-12 text-teal-600" /></div>;
    }

    // If no ID, no case study, or case study has no quiz, redirect back to memo fiche page
    if (!id || !caseStudy) {
        return <Navigate to="/dashboard" replace />;
    }
    
    // The QuizView component itself handles the "no questions" case,
    // so we can render it and let it display the appropriate message.

    return (
        <div className="bg-slate-100 py-8 min-h-screen flex items-center">
            <QuizView 
                questions={caseStudy.quiz || []}
                caseTitle={caseStudy.title}
                onBack={() => navigate(`/memofiche/${id}`)}
                quizId={id} // Pass the memo fiche ID as the quizId for tracking
            />
        </div>
    );
};

export default QuizPage;