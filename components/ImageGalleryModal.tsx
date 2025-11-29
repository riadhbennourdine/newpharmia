import React, { useState, useEffect } from 'react';
import { Spinner } from './Icons';

interface FtpFile {
    name: string;
    type: 'file' | 'directory';
    size: number;
    modifyTime: string;
}

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
    const [images, setImages] = useState<FtpFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchImages = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch('/api/ftp/list');
                    if (!response.ok) {
                        throw new Error('Failed to load gallery data from FTP.');
                    }
                    const data: FtpFile[] = await response.json();
                    setImages(data.filter(item => item.type === 'file')); // Only display files
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchImages();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // No more theme filtering
    const filteredImages = images;

    const handleImageSelect = (fileName: string) => {
        const url = `/api/ftp/view/${fileName}`; // Construct the FTP view URL
        onSelectImage(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-slate-800">Choisir une image de la galerie FTP</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">&times;</button>
                </div>
                
                {/* No more theme filtering UI */}

                <div className="overflow-y-auto flex-grow p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {filteredImages.map(image => (
                                <div key={image.name} className="cursor-pointer group" onClick={() => handleImageSelect(image.name)}>
                                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-slate-100 relative">
                                        <img src={`/api/ftp/view/${image.name}`} alt={image.name} className="w-full h-full object-cover object-center" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                            <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold text-center p-2">Sélectionner</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-800 truncate">{image.name}</p>
                                    <p className="text-xs text-slate-500">Taille: {(image.size / 1024).toFixed(2)} KB</p>
                                    <p className="text-xs text-slate-500">Modifié: {new Date(image.modifyTime).toLocaleDateString()}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                 <div className="p-4 border-t bg-slate-50 text-right">
                    <button onClick={onClose} className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300">Fermer</button>
                </div>
            </div>
        </div>
    );
};

export default ImageGalleryModal;
