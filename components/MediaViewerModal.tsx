import React from 'react';
import { WebinarResource } from '../types';
import { XCircleIcon } from './Icons';
import EmbeddableViewer from './EmbeddableViewer';

interface MediaViewerModalProps {
    resource: WebinarResource;
    onClose: () => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ resource, onClose }) => {

    const renderContent = () => {
        // All new resource types should be handled by EmbeddableViewer
        // The EmbeddableViewer itself handles different types (YouTube, Canva, PDF, HTML embed)
        if (resource.type === 'Replay' || resource.type === 'Vidéo explainer' || resource.type === 'Infographie' || resource.type === 'Diaporama') {
            return <EmbeddableViewer source={resource.source} />;
        }
        
        // Fallback for any unknown types, though with strict typing this should be rare
        return <p className="text-red-500 text-center p-4">Type de média non supporté ou source invalide.</p>;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full h-full max-w-4xl max-h-4xl flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{resource.title || 'Média'}</h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        <XCircleIcon className="h-8 w-8" />
                    </button>
                </div>
                <div className="flex-grow overflow-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default MediaViewerModal;