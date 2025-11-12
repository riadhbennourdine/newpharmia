import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Spinner, UploadIcon, SearchIcon } from '../../components/Icons';
import { MarkdownRenderer } from '../../components/MarkdownRenderer';

interface GeminiFile {
  name: string;
  uri: string;
  mimeType: string;
  // Add other relevant fields from the Gemini File API response if needed
}

const FileSearchAdmin: React.FC = () => {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedGeminiFiles, setUploadedGeminiFiles] = useState<GeminiFile[]>([]);
  const [query, setQuery] = useState<string>('');
  const [searchResult, setSearchResult] = useState<string>('');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Veuillez sélectionner au moins un fichier.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadedGeminiFiles([]); // Reset previous uploads

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/admin/filesearch/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Échec de l'upload pour le fichier ${file.name}`);
        }
        return response.json() as Promise<GeminiFile>;
      });

      const results = await Promise.all(uploadPromises);
      setUploadedGeminiFiles(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSearch = async () => {
    if (!query) {
      setError('Veuillez entrer une question pour la recherche.');
      return;
    }
    if (uploadedGeminiFiles.length === 0) {
      setError('Veuillez d\'abord uploader des fichiers.');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResult('');

    try {
      const response = await fetch('/api/admin/filesearch/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, files: uploadedGeminiFiles }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Échec de la recherche.');
      }

      const resultData = await response.json();
      setSearchResult(resultData.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-800 mb-6">Test de Recherche de Fichiers (Admin)</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Étape 1 : Uploader des Fichiers</h2>
        <div className="mb-4">
          <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-2">
            Sélectionnez des fichiers (PDF, TXT, etc.)
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
          />
        </div>
        <button
          onClick={handleUpload}
          disabled={isUploading || files.length === 0}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isUploading ? <Spinner /> : <UploadIcon className="mr-2" />}
          Uploader vers Gemini
        </button>

        {uploadedGeminiFiles.length > 0 && (
          <div className="mt-4">
            <h3 className="font-semibold text-green-700">Fichiers uploadés avec succès :</h3>
            <ul className="list-disc list-inside text-sm text-slate-600">
              {uploadedGeminiFiles.map(file => (
                <li key={file.name}><code>{file.name}</code> ({file.mimeType})</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Étape 2 : Poser une question</h2>
        <div className="mb-4">
          <label htmlFor="search-query" className="block text-sm font-medium text-slate-700 mb-2">
            Votre question
          </label>
          <input
            id="search-query"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: Quels sont les effets secondaires des statines ?"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={isSearching || uploadedGeminiFiles.length === 0 || !query}
          className="flex items-center justify-center px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg shadow-md hover:bg-teal-700 disabled:bg-gray-400 transition-colors"
        >
          {isSearching ? <Spinner /> : <SearchIcon className="mr-2" />}
          Rechercher dans les fichiers
        </button>
      </div>

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
          <p className="font-bold">Erreur</p>
          <p>{error}</p>
        </div>
      )}

      {searchResult && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Résultat de la Recherche</h2>
          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer content={searchResult} />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileSearchAdmin;
