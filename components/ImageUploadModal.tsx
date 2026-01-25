import React, { useState, useEffect, useCallback } from 'react';
import { Spinner, UploadIcon } from './Icons';
import { useDropzone } from 'react-dropzone';
import { getFtpViewUrl } from '../utils/ftp';

interface FtpFile {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifyTime: string;
}

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
}

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium transition-colors ${active ? 'border-b-2 border-teal-500 text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
  >
    {children}
  </button>
);

const ImageUploader: React.FC<{ onUploadSuccess: (url: string) => void }> = ({
  onUploadSuccess,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file); // Use 'file' as the key for the generic file upload endpoint

      setUploading(true);
      setError(null);

      try {
        const response = await fetch('/api/ftp/upload', {
          // New FTP upload endpoint
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.message || 'FTP upload failed');
        }

        const result = await response.json();
        // Construct the URL to be used by the parent modal
        const imageUrl = getFtpViewUrl(result.filename);
        onUploadSuccess(imageUrl);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    },
    [onUploadSuccess],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { '*/*': [] }, // Allow all file types
    multiple: false,
  });

  return (
    <div className="p-6">
      <div
        {...getRootProps()}
        className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${isDragActive ? 'border-teal-500' : 'border-slate-300'} border-dashed rounded-md cursor-pointer`}
      >
        <input {...getInputProps()} />
        <div className="space-y-1 text-center">
          <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
          <div className="flex text-sm text-slate-600">
            <p className="pl-1">
              {isDragActive
                ? "Déposez l'image ici..."
                : 'Glissez-déposez une image, ou cliquez pour sélectionner'}
            </p>
          </div>
          <p className="text-xs text-slate-500">PNG, JPG, GIF, WEBP</p>
        </div>
      </div>
      {uploading && (
        <div className="mt-4 flex justify-center">
          <Spinner />
        </div>
      )}
      {error && (
        <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
};

const ImageGallery: React.FC<{ onSelectImage: (url: string) => void }> = ({
  onSelectImage,
}) => {
  const [items, setItems] = useState<FtpFile[]>([]); // items inclura fichiers et dossiers
  const [isLoading, setIsLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('/'); // Nouvel état pour le chemin actuel

  // Nouvelle fonction pour remonter dans l'arborescence
  const handleGoBack = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    setCurrentPath(parentPath === '' ? '/' : parentPath);
  };

  useEffect(() => {
    const fetchImages = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/ftp/list?path=${encodeURIComponent(currentPath)}`,
        ); // Utiliser currentPath et l'encoder
        if (!response.ok) {
          throw new Error('Failed to load gallery data from FTP.');
        }
        const data: FtpFile[] = await response.json();
        // Tri pour afficher les dossiers en premier
        setItems(
          data.sort((a, b) => {
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
          }),
        );
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [currentPath]); // Refetch lorsque currentPath change

  return (
    <>
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center space-x-2">
        {currentPath !== '/' && (
          <button
            onClick={handleGoBack}
            className="p-2 bg-slate-200 rounded-md hover:bg-slate-300"
          >
            {/* Icône de retour */}
            <svg
              className="h-5 w-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
        )}
        <span className="text-sm font-medium text-slate-700">
          {currentPath === '/' ? 'Racine' : currentPath}
        </span>
      </div>
      <div className="overflow-y-auto flex-grow p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {items.map((item) =>
              item.type === 'directory' ? (
                <div
                  key={item.name}
                  className="cursor-pointer group flex flex-col items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
                  onClick={() =>
                    setCurrentPath(
                      currentPath === '/'
                        ? `/${item.name}`
                        : `${currentPath}/${item.name}`,
                    )
                  }
                >
                  {/* Icône de dossier */}
                  <svg
                    className="h-10 w-10 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <p className="mt-2 text-sm font-medium text-slate-800 truncate">
                    {item.name}
                  </p>
                </div>
              ) : (
                <div
                  key={item.name}
                  className="cursor-pointer group"
                  onClick={() =>
                    onSelectImage(getFtpViewUrl(item.name, currentPath))
                  }
                >
                  <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-slate-100 relative">
                    <img
                      src={getFtpViewUrl(item.name, currentPath)}
                      alt={item.name}
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                      <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold text-center p-2">
                        Sélectionner
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-800 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Taille: {(item.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-xs text-slate-500">
                    Modifié: {new Date(item.modifyTime).toLocaleDateString()}
                  </p>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </>
  );
};

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'upload'>('gallery');

  if (!isOpen) return null;

  const handleSelectAndClose = (url: string) => {
    onSelectImage(url);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold text-slate-800">
            Choisir ou téléverser une image
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-4 px-4" aria-label="Tabs">
            <TabButton
              active={activeTab === 'gallery'}
              onClick={() => setActiveTab('gallery')}
            >
              Galerie
            </TabButton>
            <TabButton
              active={activeTab === 'upload'}
              onClick={() => setActiveTab('upload')}
            >
              Téléverser une image
            </TabButton>
          </nav>
        </div>

        {activeTab === 'gallery' && (
          <ImageGallery onSelectImage={handleSelectAndClose} />
        )}
        {activeTab === 'upload' && (
          <ImageUploader onUploadSuccess={handleSelectAndClose} />
        )}

        <div className="p-4 border-t bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="bg-slate-200 text-slate-800 font-bold py-2 px-4 rounded-lg hover:bg-slate-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploadModal;
