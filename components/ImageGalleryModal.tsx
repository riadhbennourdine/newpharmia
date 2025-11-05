import React, { useState, useEffect } from 'react';
import { Image, ImageTheme } from '../types';
import { Spinner } from './Icons';

interface ImageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectImage: (url: string) => void;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({ isOpen, onClose, onSelectImage }) => {
    const [images, setImages] = useState<Image[]>([]);
    const [themes, setThemes] = useState<ImageTheme[]>([]);
    const [selectedTheme, setSelectedTheme] = useState<string>('all');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            const fetchImagesAndThemes = async () => {
                setIsLoading(true);
                try {
                    const [imagesRes, themesRes] = await Promise.all([
                        fetch('/api/upload/images'),
                        fetch('/api/image-themes'),
                    ]);
                    if (!imagesRes.ok || !themesRes.ok) {
                        throw new Error('Failed to load gallery data.');
                    }
                    const imagesData = await imagesRes.json();
                    const themesData = await themesRes.json();
                    setImages(imagesData);
                    setThemes(themesData);
                } catch (error) {
                    console.error(error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchImagesAndThemes();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredImages = selectedTheme === 'all' 
        ? images 
        : images.filter(img => img.theme === selectedTheme);

    const handleImageSelect = (url: string) => {
        onSelectImage(url);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-slate-800">Choisir une image de la galerie</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800">&times;</button>
                </div>
                
                <div className="p-4">
                    <label htmlFor="themeFilter" className="sr-only">Filtrer par thème</label>
                    <select 
                        id="themeFilter"
                        value={selectedTheme}
                        onChange={e => setSelectedTheme(e.target.value)}
                        className="rounded-md border-slate-300 shadow-sm"
                    >
                        <option value="all">Tous les thèmes</option>
                        {themes.map(theme => (
                            <option key={theme._id} value={theme.name}>{theme.name}</option>
                        ))}
                    </select>
                </div>

                <div className="overflow-y-auto flex-grow p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {filteredImages.map(image => (
                                <div key={image._id} className="cursor-pointer group" onClick={() => handleImageSelect(image.url)}>
                                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-slate-100 relative">
                                        <img src={image.url} alt={image.name} className="w-full h-full object-cover object-center" />
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                            <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold text-center p-2">Sélectionner</p>
                                        </div>
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-800 truncate">{image.name}</p>
                                    <p className="text-xs text-teal-600">{image.theme}</p>
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
