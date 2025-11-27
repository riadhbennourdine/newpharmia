import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/Icons';
import { TOPIC_CATEGORIES } from '../../constants';
import { Image, ImageTheme } from '../../types';
import getAbsoluteImageUrl from '../../utils/image';

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

    // State for theme management
    const [imageThemes, setImageThemes] = useState<ImageTheme[]>([]);
    const [newThemeName, setNewThemeName] = useState('');
    const [newThemeCategory, setNewThemeCategory] = useState<'Thèmes Pédagogiques' | 'Systèmes et Organes'>('Thèmes Pédagogiques');
    const [isThemeLoading, setIsThemeLoading] = useState(false);

    const fetchImages = async () => {
        try {
            const response = await fetch('/api/upload/images');
            if (!response.ok) {
                throw new Error('Failed to fetch images');
            }
            const data = await response.json();
            setImages(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const fetchImageThemes = async () => {
        try {
            const response = await fetch('/api/image-themes');
            if (!response.ok) {
                throw new Error('Failed to fetch image themes');
            }
            const data = await response.json();
            setImageThemes(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            await Promise.all([fetchImages(), fetchImageThemes()]);
            setIsLoading(false);
        };
        fetchAllData();
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
            const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
            if(fileInput) fileInput.value = "";
            await fetchImages();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddTheme = async () => {
        if (!newThemeName || !newThemeCategory) {
            setError('Le nom et la catégorie du thème sont requis.');
            return;
        }

        setIsThemeLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/image-themes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ name: newThemeName, category: newThemeCategory }),
            });

            if (!response.ok) {
                throw new Error('Failed to add theme');
            }

            setNewThemeName('');
            await fetchImageThemes();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsThemeLoading(false);
        }
    };

    const handleDeleteTheme = async (id: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce thème ?')) return;

        setIsThemeLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/image-themes/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to delete theme');
            }

            await fetchImageThemes();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsThemeLoading(false);
        }
    };

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(window.location.origin + url);
        alert('URL copiée dans le presse-papiers !');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestionnaire d'images</h1>

            {error && <p className="text-red-500 mb-4">Erreur : {error}</p>}

            {/* Theme Management Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Gérer les Thèmes d'images</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                    <div className="md:col-span-1">
                        <label htmlFor="newThemeName" className="block text-sm font-medium text-slate-600">Nom du nouveau thème</label>
                        <input
                            type="text"
                            id="newThemeName"
                            value={newThemeName}
                            onChange={(e) => setNewThemeName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                            disabled={isThemeLoading}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="newThemeCategory" className="block text-sm font-medium text-slate-600">Catégorie</label>
                        <select
                            id="newThemeCategory"
                            value={newThemeCategory}
                            onChange={(e) => setNewThemeCategory(e.target.value as 'Thèmes Pédagogiques' | 'Systèmes et Organes')}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                            disabled={isThemeLoading}
                        >
                            {TOPIC_CATEGORIES.map(cat => (
                                <option key={cat.category} value={cat.category}>{cat.category}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <button
                            onClick={handleAddTheme}
                            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
                            disabled={isThemeLoading || !newThemeName}
                        >
                            {isThemeLoading ? 'Ajout...' : 'Ajouter le thème'}
                        </button>
                    </div>
                </div>

                {imageThemes.length > 0 && (
                    <div className="mt-6">
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">Thèmes personnalisés existants</h3>
                        <ul className="flex flex-wrap gap-2">
                            {imageThemes.map(theme => (
                                <li key={theme._id} className="flex items-center bg-slate-100 rounded-full px-3 py-1 text-sm text-slate-700">
                                    {theme.name} ({theme.category})
                                    <button
                                        onClick={() => handleDeleteTheme(theme._id.toString())}
                                        className="ml-2 text-red-500 hover:text-red-700"
                                        disabled={isThemeLoading}
                                    >
                                        &times;
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Image Upload Section */}
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
                            {/* Combine TOPIC_CATEGORIES and custom image themes */}
                            {TOPIC_CATEGORIES.map(cat => (
                                <optgroup key={cat.category} label={cat.category}>
                                    {cat.topics.map(topic => (
                                        <option key={topic} value={topic}>{topic}</option>
                                    ))}
                                </optgroup>
                            ))}
                            {imageThemes.length > 0 && (
                                <optgroup label="Thèmes personnalisés">
                                    {imageThemes.map(theme => (
                                        <option key={theme._id.toString()} value={theme.name}>{theme.name}</option>
                                    ))}
                                </optgroup>
                            )}
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
                    disabled={isUploading || !selectedFile || !newImageName || !newImageTheme}
                >
                    {isUploading ? 'Téléversement...' : 'Téléverser et Enregistrer'}
                </button>
            </div>

            {/* Existing Images Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Images existantes</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Spinner className="h-12 w-12 text-teal-600" /></div>
                ) : images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {images.map(image => (
                            <div key={image._id.toString()} className="group bg-slate-50 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                <img
                                    src={getAbsoluteImageUrl(image.url)}
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