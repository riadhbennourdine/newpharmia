import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, PlusCircleIcon } from '../../components/Icons';

const ImageManager: React.FC = () => {
    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { token } = useAuth();

    const fetchImages = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/upload/images');
            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }
            const data = await response.json();
            setImageUrls(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const formData = new FormData();
            formData.append('webinarImage', file); // Using the same field name as webinar upload

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

                // Refresh the image list after successful upload
                await fetchImages();

            } catch (err) {
                setError(err.message);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        alert('URL copiée dans le presse-papiers : ' + url);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestionnaire d'images</h1>

            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Téléverser une nouvelle image</h2>
                <input 
                    type="file" 
                    id="imageUpload" 
                    onChange={handleFileUpload} 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                    disabled={isUploading}
                />
                {isUploading && <Spinner className="h-5 w-5 mt-2" />}
                {error && <p className="text-red-500 mt-2">Erreur : {error}</p>}
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Images existantes</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Spinner className="h-12 w-12 text-teal-600" /></div>
                ) : imageUrls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {imageUrls.map(url => (
                            <div key={url} className="group bg-slate-50 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                <img 
                                    src={url} 
                                    alt="Uploaded image" 
                                    className="w-full h-32 object-cover"
                                />
                                <div className="p-2 text-center">
                                    <button 
                                        onClick={() => handleCopyUrl(url)}
                                        className="text-sm text-teal-600 hover:text-teal-800 font-medium"
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
