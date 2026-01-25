// pages/admin/DataFixer.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/Icons';

interface BrokenLink {
  type: 'Webinar' | 'Proof of Payment' | 'MemoFiche';
  id: string;
  name: string;
  field: string;
  brokenUrl: string;
}

const DataFixerPage = () => {
  const { token } = useAuth();
  const [brokenLinks, setBrokenLinks] = useState<BrokenLink[]>([]);
  const [volumeFiles, setVolumeFiles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<BrokenLink | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [brokenLinksRes, volumeFilesRes] = await Promise.all([
        fetch('/api/debug/broken-links', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/debug/list-volume', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!brokenLinksRes.ok || !volumeFilesRes.ok) {
        throw new Error('Failed to fetch data from debug endpoints.');
      }

      const brokenLinksData = await brokenLinksRes.json();
      const volumeFilesData = await volumeFilesRes.json();

      setBrokenLinks(brokenLinksData);
      setVolumeFiles(volumeFilesData.files || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const handleOpenModal = (item: BrokenLink) => {
    setCurrentItem(item);
    setSearchTerm(''); // Reset search term
    setIsModalOpen(true);
  };

  const handleConfirmMatch = async (selectedFile: string) => {
    if (!currentItem) return;

    setIsUpdating(true);
    let endpoint = '';
    let body: any = {};

    const newUrl = `/uploads/${selectedFile}`;

    switch (currentItem.type) {
      case 'Webinar':
        endpoint = `/api/webinars/${currentItem.id}`;
        body = { [currentItem.field]: newUrl };
        break;
      case 'Proof of Payment':
        endpoint = `/api/admin/crm/clients/${currentItem.id}`;
        body = { paymentProofUrl: newUrl };
        break;
      case 'MemoFiche':
        endpoint = `/api/memofiches/${currentItem.id}`;
        // Handling nested fields for memofiches might be complex,
        // for now, we assume simple field updates.
        // A more robust solution might need a dedicated backend endpoint.
        if (currentItem.field.includes('[')) {
          alert(
            "La mise à jour des champs de contenu complexes n'est pas encore implémentée via cet outil.",
          );
          setIsUpdating(false);
          return;
        }
        body = { [currentItem.field]: newUrl };
        break;
      default:
        setIsUpdating(false);
        return;
    }

    try {
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Update failed');
      }

      // Refresh data
      await fetchData();
    } catch (err: any) {
      alert(`Error updating item: ${err.message}`);
    } finally {
      setIsUpdating(false);
      setIsModalOpen(false);
      setCurrentItem(null);
    }
  };

  const filteredVolumeFiles = useMemo(() => {
    if (!searchTerm) return volumeFiles;
    return volumeFiles.filter((file) =>
      file.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [searchTerm, volumeFiles]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Outil de Réparation des Liens</h1>
      {brokenLinks.length === 0 ? (
        <p className="text-green-600 font-semibold">
          ✅ Aucune URL cassée n'a été trouvée. Tout est à jour !
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-slate-700">
            Il y a {brokenLinks.length} lien(s) cassé(s) à réparer.
          </p>
          {brokenLinks.map((item, index) => (
            <div
              key={`${item.id}-${item.field}-${index}`}
              className="bg-white p-4 rounded-lg shadow-sm border flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-slate-800">
                  {item.name}{' '}
                  <span className="text-sm font-normal text-slate-500">
                    ({item.type})
                  </span>
                </p>
                <p className="text-sm text-red-600 truncate">
                  URL Cassée: {item.brokenUrl}
                </p>
              </div>
              <button
                onClick={() => handleOpenModal(item)}
                className="bg-teal-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-teal-700"
              >
                Associer un fichier
              </button>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && currentItem && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <h3 className="text-xl font-bold mb-4">
              Associer un Fichier pour "{currentItem.name}"
            </h3>
            <input
              type="text"
              placeholder="Rechercher un fichier dans le volume..."
              className="w-full p-2 border rounded-md mb-4"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="overflow-y-auto flex-grow border rounded-md">
              <ul className="divide-y">
                {filteredVolumeFiles.map((file) => (
                  <li
                    key={file}
                    className="p-2 hover:bg-teal-50 flex justify-between items-center"
                  >
                    <span>{file}</span>
                    <button
                      onClick={() => handleConfirmMatch(file)}
                      disabled={isUpdating}
                      className="bg-blue-500 text-white text-sm px-3 py-1 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                    >
                      {isUpdating ? '...' : 'Associer'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="mt-4 bg-gray-200 text-gray-800 px-4 py-2 rounded-md"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataFixerPage;
