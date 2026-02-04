
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Image } from '../../types';
import Loader from './Loader';

interface ImagePickerModalProps {
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
}

const ImagePickerModal: React.FC<ImagePickerModalProps> = ({ onClose, onSelect }) => {
  const [images, setImages] = useState<Image[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch('/api/upload/images', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Impossible de charger la galerie d\'images.');
        }
        const data = await response.json();
        setImages(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, [token]);

  const handleSelectImage = (imageUrl: string) => {
    onSelect(imageUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Choisir une image de la galerie</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoading && <div className="text-center"><Loader /></div>}
          {error && <p className="text-red-500">{error}</p>}
          {!isLoading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map(image => (
                <div key={image._id as string} onClick={() => handleSelectImage(image.url)} className="cursor-pointer group">
                  <img src={image.url} alt={image.name} className="w-full h-32 object-cover rounded-md group-hover:ring-2 ring-teal-500"/>
                  <p className="text-xs text-center truncate mt-1">{image.name}</p>
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
