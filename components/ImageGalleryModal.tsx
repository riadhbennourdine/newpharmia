import React, { useState, useEffect } from 'react';
import { Spinner } from './Icons';
import { getFtpViewUrl } from '../utils/ftp';

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
    const [items, setItems] = useState<FtpFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('/');

    useEffect(() => {
        if (isOpen) {
            fetchItems(currentPath);
        }
    }, [isOpen, currentPath]);

    const fetchItems = async (path: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/ftp/list?path=${encodeURIComponent(path)}`);
            if (!response.ok) {
                throw new Error('Failed to load gallery data from FTP.');
            }
            const data: FtpFile[] = await response.json();
            // Sort: Directories first, then files
            const sortedData = data.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
            setItems(sortedData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleItemClick = (item: FtpFile) => {
        if (item.type === 'directory') {
            const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
            setCurrentPath(newPath);
        } else {
            // Construct full path for the file
            // Note: getFtpViewUrl usually expects a full path if it's not in root, or we need to pass it correctly.
            // Looking at previous implementation, it took just 'name'. 
            // If getFtpViewUrl handles full paths, we should pass the full path.
            // Let's verify getFtpViewUrl implementation or assume we pass the relative path for the API to handle.
            // The API /api/ftp/view takes filePath query param.
            const fullPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
            const url = `/api/ftp/view?filePath=${encodeURIComponent(fullPath)}`;
            onSelectImage(url);
            onClose();
        }
    };

    const handleGoUp = () => {
        if (currentPath === '/') return;
        const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/';
        setCurrentPath(parentPath);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-2xl font-bold text-slate-800">Galerie d'images</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 text-2xl">&times;</button>
                </div>

                <div className="p-2 bg-slate-100 border-b flex items-center gap-2">
                    <button 
                        onClick={handleGoUp} 
                        disabled={currentPath === '/'}
                        className={`p-1 rounded ${currentPath === '/' ? 'text-slate-400 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-200'}`}
                        title="Remonter"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                        </svg>
                    </button>
                    <span className="font-mono text-sm text-slate-600 truncate">{currentPath}</span>
                </div>

                <div className="overflow-y-auto flex-grow p-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full"><Spinner /></div>
                    ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                            {items.length === 0 && (
                                <p className="col-span-full text-center text-slate-500 py-8">Dossier vide</p>
                            )}
                            {items.map(item => (
                                <div key={item.name} className="cursor-pointer group" onClick={() => handleItemClick(item)}>
                                    <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-slate-100 relative border border-slate-200 hover:border-teal-500 transition-colors">
                                        {item.type === 'directory' ? (
                                             <div className="w-full h-full flex items-center justify-center text-slate-400 group-hover:text-teal-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                                                </svg>
                                             </div>
                                        ) : (
                                            <img 
                                                src={`/api/ftp/view?filePath=${encodeURIComponent(currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`)}`} 
                                                alt={item.name} 
                                                className="w-full h-full object-cover object-center" 
                                            />
                                        )}
                                        {item.type === 'file' && (
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                                                <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold text-center p-2">Sélectionner</p>
                                            </div>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm font-medium text-slate-800 truncate" title={item.name}>{item.name}</p>
                                    {item.type === 'file' && (
                                         <p className="text-xs text-slate-500">{(item.size / 1024).toFixed(2)} KB</p>
                                    )}
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
