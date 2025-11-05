import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/Icons';
import { TOPIC_CATEGORIES } from '../../constants';
import { Image } from '../../types';

const ImageManager: React.FC = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { token } = useAuth();

    // State for the new image metadata
    const [newImageName, setNewImageName] = useState('');
    const [newImageTheme, setNewImageTheme] = useState(TOPIC_CATEGORIES[0].topics[0]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const fetchImages = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/upload/images');
            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }
            const data = await response.json();
            setImages(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !newImageName || !newImageTheme) {
            setError('Le nom, le thème et le fichier sont requis.');
            return;
        }

        const formData = new FormData();
        formData.append('imageFile', selectedFile);
        formData.append('name', newImageName);
        formData.append('theme', newImageTheme);

        setIsUploading(true);
        setError(null);

        try {
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                throw new Error('File upload failed');
            }

            // Reset form and refresh list
            setNewImageName('');
            setSelectedFile(null);
            await fetchImages();

        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(window.location.origin + url);
        alert('URL copiée dans le presse-papiers !');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestionnaire d'images</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Téléverser une nouvelle image</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="imageName" className="block text-sm font-medium text-slate-600">Nom de l'image</label>
                        <input 
                            type="text" 
                            id="imageName" 
                            value={newImageName}
                            onChange={(e) => setNewImageName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="imageTheme" className="block text-sm font-medium text-slate-600">Thème</label>
                        <select 
                            id="imageTheme" 
                            value={newImageTheme}
                            onChange={(e) => setNewImageTheme(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                        >
                            {TOPIC_CATEGORIES[0].topics.map(theme => (
                                <option key={theme} value={theme}>{theme}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                         <input 
                            type="file" 
                            id="imageUpload" 
                            onChange={handleFileSelect} 
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            disabled={isUploading}
                        />
                    </div>
                </div>
                 <button 
                    onClick={handleUpload}
                    className="mt-4 w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400"
                    disabled={isUploading || !selectedFile}
                >
                    {isUploading ? 'Téléversement...' : 'Téléverser et Enregistrer'}
                </button>
                {error && <p className="text-red-500 mt-2">Erreur : {error}</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Images existantes</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Spinner className="h-12 w-12 text-teal-600" /></div>
                ) : images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map(image => (
                            <div key={image._id} className="group bg-slate-50 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                <img 
                                    src={image.url} 
                                    alt={image.name} 
                                    className="w-full h-32 object-cover"
                                />
                                <div className="p-3 flex-grow">
                                    <p className="font-bold text-sm text-slate-800 truncate">{image.name}</p>
                                    <p className="text-xs text-teal-600 bg-teal-50 rounded-full px-2 py-1 inline-block mt-1">{image.theme}</p>
                                </div>
                                <div className="p-2 text-center border-t">
                                    <button 
                                        onClick={() => handleCopyUrl(image.url)}
                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                        Copier l'URL
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-500">Aucune image téléversée pour le moment.</p>
                )}
            </div>
        </div>
    );
};

export default ImageManager;
