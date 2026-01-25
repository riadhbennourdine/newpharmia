import React from 'react';
import { CaseStudy } from '../../types';
import { FormSection, Label, Input, Textarea } from './UI';
import { ImageIcon } from '../Icons';
import getAbsoluteImageUrl from '../../utils/image';

interface MediaSectionProps {
  caseStudy: CaseStudy;
  handleChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  openImageModal: (callback: (url: string) => void) => void;
  setCaseStudy: React.Dispatch<React.SetStateAction<CaseStudy>>;
}

export const MediaSection: React.FC<MediaSectionProps> = ({
  caseStudy,
  handleChange,
  openImageModal,
  setCaseStudy,
}) => {
  return (
    <FormSection title="Médias et Présentations">
      <div>
        <Label htmlFor="youtubeExplainerUrl">
          URL Vidéo YouTube Explicative
        </Label>
        <Input
          type="text"
          name="youtubeExplainerUrl"
          id="youtubeExplainerUrl"
          value={caseStudy.youtubeExplainerUrl || ''}
          onChange={handleChange}
        />
      </div>
      <div>
        <Label htmlFor="infographicImageUrl">
          URL ou Télécharger Infographie
        </Label>
        <div className="mt-1 flex items-center gap-2">
          <Input
            type="text"
            name="infographicImageUrl"
            id="infographicImageUrl"
            value={getAbsoluteImageUrl(caseStudy.infographicImageUrl)}
            onChange={handleChange}
            className="flex-grow"
          />
          <button
            type="button"
            onClick={() =>
              openImageModal((url) =>
                setCaseStudy((prev) => ({ ...prev, infographicImageUrl: url })),
              )
            }
            className="p-2 bg-slate-200 rounded-md hover:bg-slate-300"
          >
            <ImageIcon className="h-5 w-5 text-slate-600" />
          </button>
        </div>
      </div>
      <div>
        <Label htmlFor="pdfSlideshowUrl">
          Présentation (URL ou code d'intégration)
        </Label>
        <Textarea
          name="pdfSlideshowUrl"
          id="pdfSlideshowUrl"
          value={caseStudy.pdfSlideshowUrl || ''}
          onChange={handleChange}
          rows={3}
        />
        <p className="mt-1 text-xs text-slate-500">
          Accepte les URL de PDF, les liens de partage Canva, ou le code
          d'intégration HTML (iframe).
        </p>
      </div>
    </FormSection>
  );
};
