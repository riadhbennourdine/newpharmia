import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/Icons';
import path from 'path-browserify'; // Using path-browserify for cross-platform path manipulation
import { getFtpViewUrl } from '../../utils/ftp';

interface FtpItem {
    name: string;
    type: 'file' | 'directory';
    size: number;
    modifyTime: string; // From rawModifiedAt
}


const ImageManager: React.FC = () => {
    const [ftpItems, setFtpItems] = useState<FtpItem[]>([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const { token } = useAuth();

    const [currentPath, setCurrentPath] = useState<string>('/'); // Current FTP path
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [newFolderName, setNewFolderName] = useState<string>('');

    const fetchFtpItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/ftp/list?path=${encodeURIComponent(currentPath)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch FTP items');
            }
            const data: FtpItem[] = await response.json();
            // Sort directories first, then files, alphabetically
            data.sort((a, b) => {
                if (a.type === 'directory' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
            });
            setFtpItems(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchFtpItems();
    }, [currentPath]); // Re-fetch when currentPath changes

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };
    
    const handleUpload = async () => {
        if (!selectedFile) {
            setError('Veuillez sélectionner un fichier.');
            return;
        }

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('destinationPath', currentPath); // Send current path

        setIsUploading(true);
        setError(null);

        try {
            const response = await fetch('/api/ftp/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'File upload failed to FTP');
            }

            setSelectedFile(null);
            const fileInput = document.getElementById('fileUpload') as HTMLInputElement;
            if(fileInput) fileInput.value = "";
            await fetchFtpItems(); // Refresh the list
            alert('Fichier téléversé avec succès !');

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (itemName: string, itemType: 'file' | 'directory') => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer "${itemName}" (${itemType}) ?`)) return;

        setIsLoading(true);
        setError(null);

        const itemPath = path.posix.join(currentPath, itemName);

        try {
            const response = await fetch('/api/ftp/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ path: itemPath, itemType }), // Envoyer itemType
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to delete ${itemType} from FTP.`);
            }

            await fetchFtpItems(); // Refresh the list
            alert(`${itemType === 'file' ? 'Fichier' : 'Dossier'} supprimé avec succès !`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) {
            setError('Le nom du dossier ne peut pas être vide.');
            return;
        }

        setIsLoading(true); // Temporarily use isLoading for folder creation
        setError(null);

        const fullPath = path.posix.join(currentPath, newFolderName);

        try {
            const response = await fetch('/api/ftp/mkdir', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ path: fullPath }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create folder on FTP.');
            }

            setNewFolderName('');
            await fetchFtpItems(); // Refresh the list
            alert(`Dossier '${newFolderName}' créé avec succès !`);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNavigate = (itemName: string, itemType: 'file' | 'directory') => {
        if (itemType === 'directory') {
            setCurrentPath(path.posix.join(currentPath, itemName));
        }
        // If it's a file, we could potentially preview it or copy its URL.
        // For now, we only navigate into directories.
    };

    const handleGoUp = () => {
        if (currentPath === '/') return;
        setCurrentPath(path.posix.dirname(currentPath));
    };

    const handleCopyUrl = (fileName: string) => {
        const fullPath = path.posix.join(currentPath, fileName);
        const url = getFtpViewUrl(fullPath);
        navigator.clipboard.writeText(url);
        alert('URL copiée dans le presse-papiers !');
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-6">Gestionnaire de Fichiers FTP</h1>

            {error && <p className="text-red-500 mb-4">Erreur : {error}</p>}

            {/* Current Path and Navigation */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Chemin actuel: {currentPath}</h2>
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={handleGoUp}
                        disabled={currentPath === '/'}
                        className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg shadow-md hover:bg-slate-300 disabled:bg-gray-300"
                    >
                        Remonter
                    </button>
                </div>

                {/* Create Folder Section */}
                <div className="mb-4 flex items-center space-x-2">
                    <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Nom du nouveau dossier"
                        className="flex-grow rounded-md border-slate-300 shadow-sm"
                    />
                    <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim()}
                        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        Créer un dossier
                    </button>
                </div>
            </div>

            {/* File Upload Section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Téléverser un fichier</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div className="md:col-span-1">
                         <input
                            type="file"
                            id="fileUpload"
                            onChange={handleFileSelect}
                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                            disabled={isUploading}
                        />
                    </div>
                    <div className="md:col-span-1">
                         <button
                            onClick={handleUpload}
                            className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400"
                            disabled={isUploading || !selectedFile}
                        >
                            {isUploading ? 'Téléversement...' : 'Téléverser'}
                        </button>
                    </div>
                </div>
            </div>

            {/* FTP Items Section */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Contenu du dossier actuel</h2>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48"><Spinner className="h-12 w-12 text-teal-600" /></div>
                ) : ftpItems.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {ftpItems.map(item => (
                            <div key={item.name} className="group bg-slate-50 rounded-lg shadow-sm overflow-hidden flex flex-col">
                                {item.type === 'directory' ? (
                                    <button onClick={() => handleNavigate(item.name, item.type)} className="w-full h-32 flex items-center justify-center bg-blue-100 text-blue-600 text-5xl hover:bg-blue-200">
                                        📁
                                    </button>
                                ) : (
                                    <img
                                        src={getFtpViewUrl(path.posix.join(currentPath, item.name))}
                                        alt={item.name}
                                        className="w-full h-32 object-cover"
                                    />
                                )}
                                <div className="p-3 flex-grow">
                                    <p className="font-bold text-sm text-slate-800 truncate">{item.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {item.type === 'file' ? `Taille: ${(item.size / 1024).toFixed(2)} KB` : 'Dossier'}
                                    </p>
                                    <p className="text-xs text-slate-500">Modifié: {new Date(item.modifyTime).toLocaleDateString()}</p>
                                </div>
                                <div className="p-2 flex justify-between items-center border-t">
                                    {item.type === 'file' && (
                                        <button
                                            onClick={() => handleCopyUrl(item.name)}
                                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                        >
                                            Copier l'URL
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(item.name, item.type)}
                                        className="text-sm text-red-600 hover:text-red-800 font-medium ml-2"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-500">Ce dossier est vide.</p>
                )}
            </div>
        </div>
    );
};

export default ImageManager;