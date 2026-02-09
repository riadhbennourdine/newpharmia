import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Loader from './Loader';
import path from 'path-browserify';
import { getFtpViewUrl } from '../utils/ftp';

interface ImagePickerModalProps {
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

interface FtpItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
  modifyTime: string;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  onClose,
  onSelect,
}) => {
  const [items, setItems] = useState<FtpItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState('/');

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/ftp/list?path=${encodeURIComponent(currentPath)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!response.ok) {
          throw new Error('Impossible de charger les fichiers.');
        }
        const data: FtpItem[] = await response.json();
        data.sort((a, b) => {
          if (a.type === 'directory' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });
        setItems(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [token, currentPath]);

  const handleSelectImage = (fileName: string) => {
    const fullPath = path.posix.join(currentPath, fileName);
    const imageUrl = getFtpViewUrl(fullPath);
    onSelect(imageUrl);
    onClose();
  };

  const handleNavigate = (folderName: string) => {
    setCurrentPath(path.posix.join(currentPath, folderName));
  };

  const handleGoUp = () => {
    if (currentPath === '/') return;
    setCurrentPath(path.posix.dirname(currentPath));
  };

  const isImageFile = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Choisir une image</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
          >
            &times;
          </button>
        </div>

        <div className="bg-slate-100 p-2 rounded-md mb-4 flex items-center gap-4">
          <button
            onClick={handleGoUp}
            disabled={currentPath === '/'}
            className="px-3 py-1 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 disabled:opacity-50 text-sm font-semibold"
          >
            Remonter
          </button>
          <p className="text-sm text-slate-600 font-mono flex-grow">
            {currentPath}
          </p>
        </div>

        <div className="flex-grow overflow-y-auto">
          {isLoading && (
            <div className="flex justify-center items-center h-full">
              <Loader />
            </div>
          )}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((item) => (
                <div key={item.name} className="group">
                  {item.type === 'directory' ? (
                    <div
                      onClick={() => handleNavigate(item.name)}
                      className="cursor-pointer text-center p-4 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors flex flex-col items-center justify-center aspect-square"
                    >
                      <span className="text-5xl">📁</span>
                      <p className="text-sm font-semibold text-blue-800 mt-2 truncate w-full">
                        {item.name}
                      </p>
                    </div>
                  ) : isImageFile(item.name) ? (
                    <div
                      onClick={() => handleSelectImage(item.name)}
                      className="cursor-pointer rounded-lg overflow-hidden border-2 border-transparent group-hover:border-teal-500 transition-all"
                    >
                      <img
                        src={getFtpViewUrl(
                          path.posix.join(currentPath, item.name),
                        )}
                        alt={item.name}
                        className="w-full h-32 object-cover"
                      />
                      <p className="text-xs text-center truncate mt-1 p-1 bg-slate-50">
                        {item.name}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePickerModal;
