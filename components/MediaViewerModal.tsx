import React from 'react';
import { WebinarResource } from '../types';
import { XCircleIcon } from './Icons';
import PdfSlideshow from './PdfSlideshow';

interface MediaViewerModalProps {
    resource: WebinarResource;
    onClose: () => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ resource, onClose }) => {

    const getYouTubeVideoId = (url: string): string | null => {
        if (!url) return null;
        // Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
        let videoId = url.split('v=')[1];
        if (videoId) {
            const ampersandPosition = videoId.indexOf('&');
            if (ampersandPosition !== -1) {
                videoId = videoId.substring(0, ampersandPosition);
            }
            return videoId;
        }

        // Shortened URL: https://youtu.be/VIDEO_ID
        if (url.includes('youtu.be')) {
            const parts = url.split('/');
            return parts[parts.length - 1];
        }

        // Embed URL: https://www.youtube.com/embed/VIDEO_ID
        if (url.includes('/embed/')) {
            const parts = url.split('/');
            return parts[parts.length - 1];
        }

        return null;
    };


    const renderContent = () => {
        switch (resource.type) {
            case 'youtube':
                const videoId = getYouTubeVideoId(resource.url);
                if (!videoId) {
                    return <p>Invalid YouTube URL</p>;
                }
                const embedUrl = `https://www.youtube.com/embed/${videoId}`;
                return (
                    <iframe
                        width="100%"
                        height="100%"
                        src={embedUrl}
                        title={resource.title || 'YouTube video player'}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                );
            case 'pdf':
                return <PdfSlideshow pdfUrl={resource.url} />;
            case 'Infographie':
                return <img src={resource.url} alt={resource.title} className="w-full h-full object-contain" />;
            case 'link':
            case 'Replay':
            case 'Diaporama':
                return <iframe src={resource.url} title={resource.title} className="w-full h-full" />;
            default:
                return <p>Unsupported media type</p>;
        }
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