import React from 'react';
import { CaseStudy, MemoFicheStatus, UserRole } from '../../types';
import { FormSection, Label, Input, Textarea, Select } from './UI';
import { ImageIcon, TrashIcon, PlusCircleIcon } from '../Icons';
import { TOPIC_CATEGORIES } from '../../constants';
import getAbsoluteImageUrl from '../../utils/image';

interface GeneralInfoSectionProps {
    caseStudy: CaseStudy;
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    canEditStatus: boolean;
    openImageModal: (callback: (url: string) => void) => void;
    setCaseStudy: React.Dispatch<React.SetStateAction<CaseStudy>>;
    handleYoutubeLinkChange: (index: number, field: 'url' | 'title', value: string) => void;
    addYoutubeLink: () => void;
    removeYoutubeLink: (index: number) => void;
}

export const GeneralInfoSection: React.FC<GeneralInfoSectionProps> = ({
    caseStudy,
    handleChange,
    canEditStatus,
    openImageModal,
    setCaseStudy,
    handleYoutubeLinkChange,
    addYoutubeLink,
    removeYoutubeLink
}) => {
    return (
        <FormSection title="Informations Générales">
          <div>
            <Label htmlFor="type">Type de mémofiche</Label>
            <Select name="type" id="type" value={caseStudy.type} onChange={handleChange}>
                <option value="maladie">Maladie</option>
                <option value="pharmacologie">Pharmacologie</option>
                <option value="dermocosmetique">Dermocosmétique</option>
                <option value="dispositifs-medicaux">Dispositifs Médicaux</option>
                <option value="ordonnances">Ordonnances</option>
                <option value="communication">Communication</option>
                <option value="savoir">Savoir</option>
                <option value="le-medicament">Le médicament</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input type="text" name="title" id="title" value={caseStudy.title} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="shortDescription">Description Courte</Label>
            <Textarea name="shortDescription" id="shortDescription" rows={3} value={caseStudy.shortDescription} onChange={handleChange} />
          </div>
          {canEditStatus && (
            <div>
              <Label htmlFor="status">Statut</Label>
              <Select name="status" id="status" value={caseStudy.status} onChange={handleChange}>
                  {Object.values(MemoFicheStatus).map(status => (
                      <option key={status} value={status}>{status}</option>
                  ))}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Thème Pédagogique</Label>
              <Select name="theme" id="theme" value={caseStudy.theme} onChange={handleChange}>
                <option value="">Sélectionner un thème</option>
                {TOPIC_CATEGORIES[0].topics.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            {caseStudy.type !== 'communication' && (
            <div>
              <Label htmlFor="system">Système/Organe</Label>
              <Select name="system" id="system" value={caseStudy.system} onChange={handleChange}>
                <option value="">Sélectionner un système/organe</option>
                {TOPIC_CATEGORIES[1].topics.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="level">Niveau de difficulté</Label>
                <Select name="level" id="level" value={caseStudy.level} onChange={handleChange}>
                    <option>Facile</option>
                    <option>Moyen</option>
                    <option>Difficile</option>
                </Select>
            </div>
            <div className="flex items-center pt-6">
                <input type="checkbox" name="isFree" id="isFree" checked={caseStudy.isFree} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                <label htmlFor="isFree" className="ml-2 block text-sm text-gray-900">Contenu gratuit</label>
            </div>
          </div>
          <div>
            <Label htmlFor="coverImageUrl">Image de couverture</Label>
            <div className="mt-1 flex items-center gap-2">
                <Input type="text" name="coverImageUrl" id="coverImageUrl" value={getAbsoluteImageUrl(caseStudy.coverImageUrl)} onChange={handleChange} className="flex-grow" />
                <button type="button" onClick={() => openImageModal(url => setCaseStudy(prev => ({ ...prev, coverImageUrl: url })))} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                    <ImageIcon className="h-5 w-5 text-slate-600" />
                </button>
            </div>
          </div>
          {caseStudy.coverImageUrl && (
            <div>
              <Label htmlFor="coverImagePosition">Position de l'image de couverture</Label>
              <Select name="coverImagePosition" id="coverImagePosition" value={caseStudy.coverImagePosition || 'middle'} onChange={handleChange}>
                <option value="top">Haut</option>
                <option value="middle">Milieu</option>
                <option value="bottom">Bas</option>
              </Select>
            </div>
          )}
          <div>
            <Label>Liens Vidéo YouTube</Label>
            {caseStudy.youtubeLinks?.map((link, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                    <Input type="text" placeholder="Titre de la vidéo" value={link.title} onChange={(e) => handleYoutubeLinkChange(index, 'title', e.target.value)} />
                    <Input type="text" placeholder="URL de la vidéo" value={link.url} onChange={(e) => handleYoutubeLinkChange(index, 'url', e.target.value)} />
                    <button type="button" onClick={() => removeYoutubeLink(index)} className="text-red-500 hover:text-red-700">
                        <TrashIcon className="h-5 w-5" />
                    </button>
                </div>
            ))}
            {(caseStudy.youtubeLinks?.length || 0) < 3 && (
                <button type="button" onClick={addYoutubeLink} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2">
                    <PlusCircleIcon className="h-5 w-5 mr-2" />
                    Ajouter un lien YouTube
                </button>
            )}
          </div>
        </FormSection>
    );
};
