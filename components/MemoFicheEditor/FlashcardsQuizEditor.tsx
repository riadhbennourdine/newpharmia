import React from 'react';
import { CaseStudy } from '../../types';
import { FormSection, Label, Input, Textarea } from './UI';
import { TrashIcon, PlusCircleIcon } from '../Icons';

interface FlashcardsEditorProps {
  caseStudy: CaseStudy;
  handleItemChange: (
    listName: 'flashcards' | 'quiz' | 'glossary',
    index: number,
    field: string,
    value: string | number,
  ) => void;
  handleAddItem: (listName: 'flashcards' | 'quiz' | 'glossary') => void;
  handleRemoveItem: (
    listName: 'flashcards' | 'quiz' | 'glossary',
    index: number,
  ) => void;
}

export const FlashcardsEditor: React.FC<FlashcardsEditorProps> = ({
  caseStudy,
  handleItemChange,
  handleAddItem,
  handleRemoveItem,
}) => {
  return (
    <FormSection title="Flashcards">
      {caseStudy.flashcards.map((flashcard, index) => (
        <div
          key={index}
          className="p-3 border rounded-md bg-slate-50 space-y-2"
        >
          <div className="flex justify-between items-center">
            <p className="font-semibold">Flashcard {index + 1}</p>
            <button
              type="button"
              onClick={() => handleRemoveItem('flashcards', index)}
              className="text-red-500 hover:text-red-700"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          <div>
            <Label htmlFor={`flashcard-q-${index}`}>Question</Label>
            <Input
              id={`flashcard-q-${index}`}
              type="text"
              value={flashcard.question}
              onChange={(e) =>
                handleItemChange(
                  'flashcards',
                  index,
                  'question',
                  e.target.value,
                )
              }
            />
          </div>
          <div>
            <Label htmlFor={`flashcard-a-${index}`}>Réponse</Label>
            <Textarea
              id={`flashcard-a-${index}`}
              rows={2}
              value={flashcard.answer}
              onChange={(e) =>
                handleItemChange('flashcards', index, 'answer', e.target.value)
              }
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => handleAddItem('flashcards')}
        className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2"
      >
        <PlusCircleIcon className="h-5 w-5 mr-2" />
        Ajouter une Flashcard
      </button>
    </FormSection>
  );
};

interface QuizEditorProps extends FlashcardsEditorProps {
  handleQuizOptionChange: (
    qIndex: number,
    oIndex: number,
    value: string,
  ) => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  caseStudy,
  handleItemChange,
  handleAddItem,
  handleRemoveItem,
  handleQuizOptionChange,
}) => {
  return (
    <FormSection title="Quiz">
      {caseStudy.quiz?.map((question, qIndex) => (
        <div
          key={qIndex}
          className="p-3 border rounded-md bg-slate-50 space-y-3"
        >
          <div className="flex justify-between items-center">
            <p className="font-semibold">Question {qIndex + 1}</p>
            <button
              type="button"
              onClick={() => handleRemoveItem('quiz', qIndex)}
              className="text-red-500 hover:text-red-700"
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
          <div>
            <Label htmlFor={`quiz-q-${qIndex}`}>Question</Label>
            <Input
              id={`quiz-q-${qIndex}`}
              type="text"
              value={question.question}
              onChange={(e) =>
                handleItemChange('quiz', qIndex, 'question', e.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Options et bonne réponse</Label>
            {question.options.map((option, oIndex) => (
              <div key={oIndex} className="flex items-center gap-3">
                <input
                  type="radio"
                  id={`quiz-q${qIndex}-o${oIndex}-radio`}
                  name={`quiz-correct-${qIndex}`}
                  checked={question.correctAnswerIndex === oIndex}
                  onChange={() =>
                    handleItemChange(
                      'quiz',
                      qIndex,
                      'correctAnswerIndex',
                      oIndex,
                    )
                  }
                  className="h-5 w-5 text-teal-600 border-gray-300 focus:ring-teal-500 cursor-pointer"
                />
                <Input
                  id={`quiz-q${qIndex}-o${oIndex}`}
                  placeholder={`Option ${oIndex + 1}`}
                  type="text"
                  value={option}
                  onChange={(e) =>
                    handleQuizOptionChange(qIndex, oIndex, e.target.value)
                  }
                  className="flex-grow"
                />
              </div>
            ))}
          </div>
          <div>
            <Label htmlFor={`quiz-exp-${qIndex}`}>Explication</Label>
            <Textarea
              id={`quiz-exp-${qIndex}`}
              rows={2}
              value={question.explanation}
              onChange={(e) =>
                handleItemChange('quiz', qIndex, 'explanation', e.target.value)
              }
            />
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => handleAddItem('quiz')}
        className="flex items-center px-3 py-1 bg-teal-100 text-teal-800 text-sm font-semibold rounded-md hover:bg-teal-200 mt-2"
      >
        <PlusCircleIcon className="h-5 w-5 mr-2" />
        Ajouter une Question
      </button>
    </FormSection>
  );
};
