import React, { useRef } from 'react';
import { WebinarResource } from '../types';
import {
  XCircleIcon,
  DocumentArrowDownIcon,
} from './Icons';
import EmbeddableViewer from './EmbeddableViewer';

interface MediaViewerModalProps {
  resource: WebinarResource;
  onClose: () => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  resource,
  onClose,
}) => {
  const isGoogleDoc = resource.source.includes('docs.google.com/document');

  const getGoogleDocId = (url: string): string | null => {
    const match = url.match(/document\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const docId = isGoogleDoc ? getGoogleDocId(resource.source) : null;
  const downloadUrl = docId
    ? `https://docs.google.com/document/d/${docId}/export?format=pdf`
    : '#';

  const renderContent = () => {
    // All new resource types should be handled by EmbeddableViewer
    // The EmbeddableViewer itself handles different types (YouTube, Canva, PDF, HTML embed)
    if (
      resource.type === 'Replay' ||
      resource.type === 'Vidéo explainer' ||
      resource.type === 'Infographie' ||
      resource.type === 'Diaporama' ||
      resource.type === 'pdf' ||
      resource.type === 'link' ||
      resource.type === 'youtube' ||
      resource.type === 'googledoc'
    ) {
      return <EmbeddableViewer source={resource.source} />;
    }

    // Fallback for any unknown types, though with strict typing this should be rare
    return (
      <p className="text-red-500 text-center p-4">
        Type de média non supporté ou source invalide.
      </p>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full h-full max-w-4xl max-h-4xl flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{resource.title || 'Média'}</h3>
          <div className="flex items-center gap-4">
            {isGoogleDoc && (
              <>
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                  title="Enregistrer en PDF"
                >
                  <DocumentArrowDownIcon className="h-6 w-6" />
                </a>
              </>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-700"
            >
              <XCircleIcon className="h-8 w-8" />
            </button>
          </div>
        </div>
        <div className="flex-grow overflow-auto">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MediaViewerModal;
