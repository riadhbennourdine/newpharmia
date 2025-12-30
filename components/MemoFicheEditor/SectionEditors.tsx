import React from 'react';
import { MemoFicheSection } from '../../types';
import { TrashIcon, PlusCircleIcon, ChevronUpIcon, ChevronDownIcon, ImageIcon } from '../Icons';
import { Input, Textarea } from './UI';
import getAbsoluteImageUrl from '../../utils/image';

interface RichContentSectionEditorProps {
  section: MemoFicheSection;
  onChange: (section: MemoFicheSection) => void;
  showTitle?: boolean;
  onRemove?: () => void;
  openImageModal: (callback: (url: string) => void) => void;
}

export const RichContentSectionEditor: React.FC<RichContentSectionEditorProps> = ({ section, onChange, showTitle = true, onRemove, openImageModal }) => {

  const handleContentChange = (index: number, value: string) => {
    const newContent = [...(section.content || [])];
    newContent[index] = { ...newContent[index], value };
    onChange({ ...section, content: newContent });
  };

  const addContentBlock = (type: 'text' | 'image' | 'video') => {
    const newContent = [...(section.content || []), { type, value: '' }];
    onChange({ ...section, content: newContent });
  };

  const removeContentBlock = (index: number) => {
    const newContent = [...(section.content || [])];
    newContent.splice(index, 1);
    onChange({ ...section, content: newContent });
  };

  return (
    <div className="border p-3 rounded-md bg-slate-50 relative">
      {showTitle && (
        <div className="flex items-start gap-2 mb-2">
          <div className="flex-grow">
            <label htmlFor={`custom_title_${section.id}`}>Titre de la section</label>
            <Input type="text" id={`custom_title_${section.id}`} value={section.title} onChange={e => onChange({ ...section, title: e.target.value })} />
          </div>
          {onRemove && <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>}
        </div>
      )}
      <div className="space-y-2">
        {(section.content || []).map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {item.type === 'text' && <Textarea value={item.value} onChange={e => handleContentChange(index, e.target.value)} rows={3} className="flex-grow" />}
            {item.type === 'image' && (
              <div className="flex-grow flex items-center gap-2">
                <Input type="text" value={getAbsoluteImageUrl(item.value)} onChange={e => handleContentChange(index, e.target.value)} placeholder="URL de l'image" className="flex-grow" />
                <button type="button" onClick={() => openImageModal(url => handleContentChange(index, url))} className="p-2 bg-slate-200 rounded-md hover:bg-slate-300">
                  <ImageIcon className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            )}
            {item.type === 'video' && <Input type="text" value={item.value} onChange={e => handleContentChange(index, e.target.value)} placeholder="URL de la vidéo YouTube" className="flex-grow" />}
            <button type="button" onClick={() => removeContentBlock(index)} className="text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <button type="button" onClick={() => addContentBlock('text')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Texte
        </button>
        <button type="button" onClick={() => addContentBlock('image')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Image
        </button>
        <button type="button" onClick={() => addContentBlock('video')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          Vidéo
        </button>
      </div>
    </div>
  );
};

interface SectionWrapperProps {
    title: string;
    children: React.ReactNode;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
    onRemove?: () => void;
}

export const SectionWrapper: React.FC<SectionWrapperProps> = ({ title, children, onMoveUp, onMoveDown, isFirst, isLast, onRemove }) => {
    return (
        <div className="border p-4 rounded-lg bg-white shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-slate-800">{title}</h3>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={onMoveUp} disabled={isFirst} className="text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronUpIcon className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={onMoveDown} disabled={isLast} className="text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <ChevronDownIcon className="h-5 w-5" />
                    </button>
                    {onRemove && (
                        <button type="button" onClick={onRemove} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
            <div className="space-y-4">{children}</div>
        </div>
    );
};
