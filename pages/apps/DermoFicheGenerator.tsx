import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BeakerIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  PhotoIcon,
} from '../../components/Icons';

const DermoFicheGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [pathologyName, setPathologyName] = useState('');
  const [rawText, setRawText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedJson, setGeneratedJson] = useState<any>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!pathologyName) {
      setError('Le nom de la pathologie est requis.');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedJson(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/gemini/generate-dermo-fiche', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pathologyName, rawText }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedJson(data);
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue lors de la génération.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (generatedJson) {
      navigator.clipboard.writeText(JSON.stringify(generatedJson, null, 2));
      alert('JSON copié dans le presse-papier !');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
    }
  };

  const handleSaveAndRedirect = async () => {
    if (!generatedJson) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');

      // 1. Upload Image if selected
      let uploadedImageUrl = '';
      if (selectedImage) {
        const formData = new FormData();
        formData.append('imageFile', selectedImage);
        formData.append('name', pathologyName || 'DermoImage');
        formData.append('theme', 'Dermatologie');

        const uploadResponse = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          uploadedImageUrl = uploadResult.imageUrl;
        } else {
          console.warn('Image upload failed');
        }
      }

      // 2. Prepare JSON with image handling
      const cleanData = JSON.parse(JSON.stringify(generatedJson));
      cleanData.status = 'Published'; // Force publication for immediate visibility in DermoGuide app

      const sanitizeSection = (section: any) => {
        if (section && section.content && Array.isArray(section.content)) {
          section.content = section.content.map((item: any) => {
            // Priority: If user uploaded an image, use it in the first image slot found
            if (item.type === 'image') {
              if (uploadedImageUrl) {
                // Consume the uploaded image
                const url = uploadedImageUrl;
                // uploadedImageUrl = ''; // Uncomment if we only want to use it once, but using it everywhere is safer for now
                return { type: 'image', value: url };
              }

              // If no upload but prompts exists, convert to text
              if (item.value && !item.value.startsWith('http')) {
                return {
                  type: 'text',
                  value: `📸 **Image à prévoir :** ${item.value}`,
                };
              }
            }
            return item;
          });
        }
      };

      sanitizeSection(cleanData.patientSituation);
      sanitizeSection(cleanData.pathologyOverview);

      // 3. Save Fiche
      const response = await fetch('/api/memofiches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(cleanData),
      });

      if (!response.ok)
        throw new Error('Erreur lors de la sauvegarde de la fiche');

      const newFiche = await response.json();
      navigate(`/memofiche/${newFiche._id}`);
    } catch (err: any) {
      alert('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 font-poppins flex items-center">
            <span className="text-4xl mr-3">🧪</span> Générateur DermoGuide
          </h1>
          <p className="mt-2 text-gray-600">
            Transformez un texte d'Atlas ou de cours en Mémofiche structurée
            (PHARMA).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* INPUT COLUMN */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-teal-100 text-teal-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                ETAPE 1
              </span>
              Source
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom de la Pathologie *
                </label>
                <input
                  type="text"
                  value={pathologyName}
                  onChange={(e) => setPathologyName(e.target.value)}
                  placeholder="ex: Psoriasis Vulgaire, Eczéma de Contact..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contenu Brut (Optionnel)
                  <span className="ml-2 text-xs text-gray-400">
                    Copiez-collez ici le texte de référence (Atlas, Cours)
                  </span>
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  placeholder="Collez ici le texte clinique décrivant la pathologie, les symptômes, les traitements..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Illustration (Optionnel)
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <PhotoIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-700">
                      Choisir une image...
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                  {selectedImage && (
                    <span className="text-sm text-teal-600 font-medium truncate max-w-xs">
                      {selectedImage.name}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Cette image remplacera la suggestion de l'IA dans la fiche
                  finale.
                </p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isLoading || !pathologyName}
                className={`w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white transition-all ${
                  isLoading || !pathologyName
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-700 shadow-md hover:shadow-lg'
                }`}
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Génération en cours avec Gemini...
                  </>
                ) : (
                  <>
                    <BeakerIcon className="-ml-1 mr-3 h-5 w-5" />
                    Générer la Fiche
                  </>
                )}
              </button>
              {error && (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OUTPUT COLUMN */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded">
                  ETAPE 2
                </span>
                Résultat
              </h2>
              <div className="flex space-x-2">
                {generatedJson && (
                  <>
                    <button
                      onClick={handleCopyToClipboard}
                      className="text-sm text-gray-500 hover:text-gray-800 flex items-center px-3 py-1 rounded border border-gray-300"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                      Copier
                    </button>
                    <button
                      onClick={handleSaveAndRedirect}
                      disabled={isSaving}
                      className="text-sm text-white bg-teal-600 hover:bg-teal-700 flex items-center px-3 py-1 rounded shadow-sm font-medium"
                    >
                      {isSaving ? (
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                      )}
                      Sauvegarder & Voir
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex-grow bg-slate-50 rounded-lg border border-gray-200 p-4 font-mono text-xs text-slate-700 overflow-auto max-h-[600px] whitespace-pre-wrap">
              {generatedJson ? (
                JSON.stringify(generatedJson, null, 2)
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <BeakerIcon className="h-12 w-12 mb-2 opacity-20" />
                  <p>Le résultat généré apparaîtra ici.</p>
                </div>
              )}
            </div>

            {generatedJson && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 italic mb-2">
                  * L'image sélectionnée (si présente) sera automatiquement
                  intégrée à la place du texte généré lors de la sauvegarde.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DermoFicheGenerator;
