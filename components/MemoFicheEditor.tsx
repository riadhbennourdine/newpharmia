import React, { useState, useEffect } from 'react';
import { CaseStudy, QuizQuestion, Flashcard, GlossaryTerm } from '../types';
import { ensureArray } from '../utils/array';
import { TrashIcon, PlusCircleIcon } from './Icons';

interface MemoFicheEditorProps {
  initialCaseStudy?: CaseStudy;
  onSave: (caseStudy: CaseStudy) => void;
  onCancel: () => void;
}

const createSafeCaseStudy = (caseStudy: CaseStudy | undefined): CaseStudy => {
  return {
    _id: caseStudy?._id || '',
    id: caseStudy?.id || '',
    type: caseStudy?.type || 'maladie',
    title: caseStudy?.title || '',
    shortDescription: caseStudy?.shortDescription || '',
    theme: caseStudy?.theme || '',
    system: caseStudy?.system || '',
    level: caseStudy?.level || 'Facile',
    isFree: caseStudy?.isFree || false,
    coverImageUrl: caseStudy?.coverImageUrl || '',
    youtubeUrl: caseStudy?.youtubeUrl || '',
    kahootUrl: caseStudy?.kahootUrl || '',
    patientSituation: caseStudy?.patientSituation || '',
    keyQuestions: ensureArray(caseStudy?.keyQuestions),
    pathologyOverview: caseStudy?.pathologyOverview || '',
    redFlags: ensureArray(caseStudy?.redFlags),
    recommendations: {
      mainTreatment: ensureArray(caseStudy?.recommendations?.mainTreatment),
      associatedProducts: ensureArray(caseStudy?.recommendations?.associatedProducts),
      lifestyleAdvice: ensureArray(caseStudy?.recommendations?.lifestyleAdvice),
      dietaryAdvice: ensureArray(caseStudy?.recommendations?.dietaryAdvice),
    },
    keyPoints: ensureArray(caseStudy?.keyPoints),
    references: ensureArray(caseStudy?.references),
    flashcards: ensureArray(caseStudy?.flashcards),
    glossary: ensureArray(caseStudy?.glossary),
    quiz: ensureArray(caseStudy?.quiz),
  customSections: ensureArray(caseStudy?.customSections),
  };
};

type ListName = 'quiz' | 'flashcards' | 'glossary';

const FormSection: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div className="border p-4 rounded-lg bg-white shadow-sm">
      <h3 className="text-xl font-semibold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
);

const Label: React.FC<{htmlFor: string, children: React.ReactNode}> = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">{children}</label>
);

const Input: React.FC<any> = (props) => (
  <input {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

const Textarea: React.FC<any> = (props) => (
  <textarea {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" />
);

const MemoFicheEditor: React.FC<MemoFicheEditorProps> = ({ initialCaseStudy, onSave, onCancel }) => {
  const [caseStudy, setCaseStudy] = useState<CaseStudy>(createSafeCaseStudy(initialCaseStudy));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setCaseStudy(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleArrayChange = (name: keyof CaseStudy, value: string) => {
    const arrayValue = value.split('\n').filter(item => item.trim() !== '');
    setCaseStudy(prev => ({ ...prev, [name]: arrayValue as any }));
  };

  const handleNestedArrayChange = (parent: 'recommendations', child: string, value: string) => {
    const arrayValue = value.split('\n').filter(item => item.trim() !== '');
    setCaseStudy(prev => ({
        ...prev,
        [parent]: {
            ...prev[parent],
            [child]: arrayValue,
        },
    }));
  };

  const handleItemChange = (listName: ListName, index: number, field: string, value: string | number) => {
    setCaseStudy(prev => {
      const newList = [...(prev[listName] as any[])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
  };
  
  const handleQuizOptionChange = (qIndex: number, oIndex: number, value: string) => {
    setCaseStudy(prev => {
      const newQuiz = [...(prev.quiz || [])];
      const newOptions = [...newQuiz[qIndex].options];
      newOptions[oIndex] = value;
      newQuiz[qIndex] = { ...newQuiz[qIndex], options: newOptions };
      return { ...prev, quiz: newQuiz };
    });
  };
  
  const handleAddItem = (listName: ListName) => {
    setCaseStudy(prev => {
      let newItem: QuizQuestion | Flashcard | GlossaryTerm;
      if (listName === 'quiz') {
        newItem = { question: '', options: ['', '', '', ''], correctAnswerIndex: 0, explanation: '' };
      } else if (listName === 'flashcards') {
        newItem = { question: '', answer: '' };
      } else { // glossary
        newItem = { term: '', definition: '' };
      }
      return { ...prev, [listName]: [...(prev[listName] as any[]), newItem] };
    });
  };
  
  const handleRemoveItem = (listName: ListName, index: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cet élément ?")) {
      setCaseStudy(prev => {
        const newList = [...(prev[listName] as any[])];
        newList.splice(index, 1);
        return { ...prev, [listName]: newList };
      });
    }
  };

  const handleCustomSectionChange = (index: number, field: 'title' | 'content', value: string) => {
    setCaseStudy(prev => {
      const newCustomSections = [...(prev.customSections || [])];
      newCustomSections[index] = { ...newCustomSections[index], [field]: value };
      return { ...prev, customSections: newCustomSections };
    });
  };

  const addCustomSection = () => {
    setCaseStudy(prev => ({
      ...prev,
      customSections: [...(prev.customSections || []), { title: 'Nouvelle Section', content: '' }],
    }));
  };

  const removeCustomSection = (index: number) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette section personnalisée ?")) {
      setCaseStudy(prev => {
        const newCustomSections = [...(prev.customSections || [])];
        newCustomSections.splice(index, 1);
        return { ...prev, customSections: newCustomSections };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(caseStudy);
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <h2 className="text-3xl font-bold text-slate-800 mb-6">{initialCaseStudy?._id ? 'Modifier la Mémofiche' : 'Créer une Nouvelle Mémofiche'}</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        <FormSection title="Informations Générales">
          <div>
            <Label htmlFor="title">Titre</Label>
            <Input type="text" name="title" id="title" value={caseStudy.title} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="shortDescription">Description Courte</Label>
            <Textarea name="shortDescription" id="shortDescription" rows={3} value={caseStudy.shortDescription} onChange={handleChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="theme">Thème Pédagogique</Label>
              <Input type="text" name="theme" id="theme" value={caseStudy.theme} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="system">Système/Organe</Label>
              <Input type="text" name="system" id="system" value={caseStudy.system} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="level">Niveau de difficulté</Label>
                <select name="level" id="level" value={caseStudy.level} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500">
                    <option>Facile</option>
                    <option>Moyen</option>
                    <option>Difficile</option>
                </select>
            </div>
            <div className="flex items-center pt-6">
                <input type="checkbox" name="isFree" id="isFree" checked={caseStudy.isFree} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                <label htmlFor="isFree" className="ml-2 block text-sm text-gray-900">Contenu gratuit</label>
            </div>
          </div>
          <div>
            <Label htmlFor="coverImageUrl">URL de l'image de couverture</Label>
            <Input type="text" name="coverImageUrl" id="coverImageUrl" value={caseStudy.coverImageUrl} onChange={handleChange} />
          </div>
          <div>
            <Label htmlFor="youtubeUrl">URL Vidéo YouTube</Label>
            <Input type="text" name="youtubeUrl" id="youtubeUrl" value={caseStudy.youtubeUrl} onChange={handleChange} />
          </div>
           <div>
            <Label htmlFor="kahootUrl">URL Jeu Kahoot!</Label>
            <Input type="text" name="kahootUrl" id="kahootUrl" value={caseStudy.kahootUrl} onChange={handleChange} />
          </div>
        </FormSection>

        </FormSection>

        {caseStudy.type !== 'pharmacologie' && (
            <FormSection title="Contenu du Mémo">
              <div>
                <Label htmlFor="patientSituation">Cas comptoir</Label>
                <Textarea name="patientSituation" id="patientSituation" rows={5} value={caseStudy.patientSituation} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="keyQuestions">Questions clés à poser (une par ligne)</Label>
                <Textarea name="keyQuestions" id="keyQuestions" rows={5} value={caseStudy.keyQuestions.join('\n')} onChange={(e) => handleArrayChange('keyQuestions', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="pathologyOverview">Aperçu pathologie</Label>
                <Textarea name="pathologyOverview" id="pathologyOverview" rows={5} value={caseStudy.pathologyOverview} onChange={handleChange} />
              </div>
              <div>
                <Label htmlFor="redFlags">Signaux d'alerte (un par ligne)</Label>
                <Textarea name="redFlags" id="redFlags" rows={5} value={caseStudy.redFlags.join('\n')} onChange={(e) => handleArrayChange('redFlags', e.target.value)} />
              </div>
            </FormSection>
        )}

        <FormSection title="Recommandations">
            <div>
                <Label htmlFor="mainTreatment">Traitement principal (un par ligne)</Label>
                <Textarea name="mainTreatment" id="mainTreatment" rows={4} value={caseStudy.recommendations.mainTreatment.join('\n')} onChange={(e) => handleNestedArrayChange('recommendations', 'mainTreatment', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="associatedProducts">Produits associés (un par ligne)</Label>
                <Textarea name="associatedProducts" id="associatedProducts" rows={4} value={caseStudy.recommendations.associatedProducts.join('\n')} onChange={(e) => handleNestedArrayChange('recommendations', 'associatedProducts', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="lifestyleAdvice">Hygiène de vie (un par ligne)</Label>
                <Textarea name="lifestyleAdvice" id="lifestyleAdvice" rows={4} value={caseStudy.recommendations.lifestyleAdvice.join('\n')} onChange={(e) => handleNestedArrayChange('recommendations', 'lifestyleAdvice', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="dietaryAdvice">Conseils alimentaires (un par ligne)</Label>
                <Textarea name="dietaryAdvice" id="dietaryAdvice" rows={4} value={caseStudy.recommendations.dietaryAdvice.join('\n')} onChange={(e) => handleNestedArrayChange('recommendations', 'dietaryAdvice', e.target.value)} />
            </div>
        </FormSection>

        <FormSection title="Points Clés & Références">
            <div>
                <Label htmlFor="keyPoints">Points clés à retenir (un par ligne)</Label>
                <Textarea name="keyPoints" id="keyPoints" rows={5} value={caseStudy.keyPoints.join('\n')} onChange={(e) => handleArrayChange('keyPoints', e.target.value)} />
            </div>
            <div>
                <Label htmlFor="references">Références (une par ligne)</Label>
                <Textarea name="references" id="references" rows={4} value={caseStudy.references.join('\n')} onChange={(e) => handleArrayChange('references', e.target.value)} />
            </div>
        </FormSection>

        <FormSection title="Sections Personnalisées">
            <div className="space-y-4">
                {caseStudy.customSections?.map((section, index) => (
                    <div key={index} className="border p-3 rounded-md bg-slate-50 relative">
                        <div className="flex items-start gap-2 mb-2">
                            <div className="flex-grow">
                                <Label htmlFor={`custom_title_${index}`}>Titre de la section</Label>
                                <Input type="text" id={`custom_title_${index}`} value={section.title} onChange={e => handleCustomSectionChange(index, 'title', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor={`custom_content_${index}`}>Contenu de la section</Label>
                            <Textarea id={`custom_content_${index}`} value={section.content} onChange={e => handleCustomSectionChange(index, 'content', e.target.value)} rows={4}></Textarea>
                        </div>
                        <button type="button" onClick={() => removeCustomSection(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                ))}
                <button type="button" onClick={addCustomSection} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Ajouter une section
                </button>
            </div>
        </FormSection>

        <FormSection title="Quiz">
            <div className="space-y-4">
                {caseStudy.quiz?.map((q, qIndex) => (
                    <div key={qIndex} className="border p-3 rounded-md bg-slate-50 relative">
                        <Label htmlFor={`quiz_question_${qIndex}`}>Question {qIndex + 1}</Label>
                        <Textarea id={`quiz_question_${qIndex}`} value={q.question} onChange={e => handleItemChange('quiz', qIndex, 'question', e.target.value)} rows={2} />
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                            {q.options.map((opt, oIndex) => (
                                <div key={oIndex}>
                                    <Label htmlFor={`quiz_q${qIndex}_o${oIndex}`}>Option {oIndex + 1}</Label>
                                    <Input type="text" id={`quiz_q${qIndex}_o${oIndex}`} value={opt} onChange={e => handleQuizOptionChange(qIndex, oIndex, e.target.value)} />
                                </div>
                            ))}
                        </div>
                        <div className="mt-2">
                            <Label htmlFor={`quiz_answer_${qIndex}`}>Index de la bonne réponse (0-3)</Label>
                            <Input type="number" id={`quiz_answer_${qIndex}`} value={q.correctAnswerIndex} onChange={e => handleItemChange('quiz', qIndex, 'correctAnswerIndex', parseInt(e.target.value, 10))} />
                        </div>
                        <div className="mt-2">
                            <Label htmlFor={`quiz_explanation_${qIndex}`}>Explication</Label>
                            <Textarea id={`quiz_explanation_${qIndex}`} value={q.explanation} onChange={e => handleItemChange('quiz', qIndex, 'explanation', e.target.value)} rows={2} />
                        </div>
                        <button type="button" onClick={() => handleRemoveItem('quiz', qIndex)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => handleAddItem('quiz')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Ajouter une question de quiz
                </button>
            </div>
        </FormSection>
        
        <FormSection title="Flashcards">
            <div className="space-y-4">
                {caseStudy.flashcards?.map((f, fIndex) => (
                    <div key={fIndex} className="border p-3 rounded-md bg-slate-50 relative grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor={`flash_question_${fIndex}`}>Question</Label>
                            <Textarea id={`flash_question_${fIndex}`} value={f.question} onChange={e => handleItemChange('flashcards', fIndex, 'question', e.target.value)} rows={3} />
                        </div>
                        <div>
                            <Label htmlFor={`flash_answer_${fIndex}`}>Réponse</Label>
                            <Textarea id={`flash_answer_${fIndex}`} value={f.answer} onChange={e => handleItemChange('flashcards', fIndex, 'answer', e.target.value)} rows={3} />
                        </div>
                        <button type="button" onClick={() => handleRemoveItem('flashcards', fIndex)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => handleAddItem('flashcards')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Ajouter une flashcard
                </button>
            </div>
        </FormSection>

        <FormSection title="Glossaire">
            <div className="space-y-4">
                {caseStudy.glossary?.map((g, gIndex) => (
                    <div key={gIndex} className="border p-3 rounded-md bg-slate-50 relative grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <Label htmlFor={`glossary_term_${gIndex}`}>Terme</Label>
                            <Input type="text" id={`glossary_term_${gIndex}`} value={g.term} onChange={e => handleItemChange('glossary', gIndex, 'term', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor={`glossary_def_${gIndex}`}>Définition</Label>
                            <Textarea id={`glossary_def_${gIndex}`} value={g.definition} onChange={e => handleItemChange('glossary', gIndex, 'definition', e.target.value)} rows={2} />
                        </div>
                        <button type="button" onClick={() => handleRemoveItem('glossary', gIndex)} className="absolute top-2 right-2 text-red-500 hover:text-red-700"><TrashIcon className="h-5 w-5" /></button>
                    </div>
                ))}
                <button type="button" onClick={() => handleAddItem('glossary')} className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200">
                  <PlusCircleIcon className="h-5 w-5 mr-2" />
                  Ajouter un terme au glossaire
                </button>
            </div>
        </FormSection>

        <div className="flex justify-end space-x-4 pt-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            Annuler
          </button>
          <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-teal-600 hover:bg-teal-700">
            Sauvegarder la Mémofiche
          </button>
        </div>
      </form>
    </div>
  );
};

export default MemoFicheEditor;