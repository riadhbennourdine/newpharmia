import { ObjectId } from 'mongodb';

export enum UserRole {
  VISITEUR = 'VISITEUR',
  APPRENANT = 'APPRENANT',
  FORMATEUR = 'FORMATEUR',
  ADMIN = 'ADMIN',
  PHARMACIEN = 'PHARMACIEN',
  PREPARATEUR = 'PREPARATEUR',
}

export enum ClientStatus {
  PROSPECT = 'PROSPECT',
  CONTACTED = 'CONTACTED',
  MEETING_SCHEDULED = 'MEETING_SCHEDULED',
  NEEDS_FOLLOW_UP = 'NEEDS_FOLLOW_UP',
  ACTIVE_CLIENT = 'ACTIVE_CLIENT',
  FORMER_CLIENT = 'FORMER_CLIENT',
}

export interface User {
  _id: ObjectId | string;
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  profileIncomplete?: boolean;
  city?: string;
  pharmacistId?: ObjectId;
  hasActiveSubscription?: boolean;
  planName?: string;
  subscriptionEndDate?: Date;
  trialExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  readFicheIds?: string[];
  quizHistory?: any[];
  viewedMediaIds?: string[];
  phoneNumber?: string;
  status?: ClientStatus;
  assignedTo?: ObjectId;
  companyName?: string;
  lastContactDate?: Date;
  notes?: string;
  teamSize?: number;
}

export interface Client extends User {
  // Client-specific properties can be added here
}

export interface Prospect extends User {
  // Prospect-specific properties can be added here
}

export interface PharmacistWithCollaborators extends User {
  collaborators?: User[];
}

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface MemoFicheSection {
  title: string;
  content: string;
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface CaseStudy {
  _id: ObjectId | string;
  id: string;
  type?: 'maladie' | 'pharmacologie' | 'dermocosmetique' | 'exhaustive' | 'dispositifs-medicaux' | 'ordonnances';
  title: string;
  shortDescription: string;
  theme: string;
  system: string;
  creationDate: string;
  isLocked?: boolean;
  patientSituation: string;
  keyQuestions: string[];
  pathologyOverview: string;
  redFlags: string[];
  recommendations: {
    mainTreatment: string[];
    associatedProducts: string[];
    lifestyleAdvice: string[];
    dietaryAdvice: string[];
  };
  references: string[];
  keyPoints: string[];
  glossary: GlossaryTerm[];
  flashcards: Flashcard[];
  coverImageUrl?: string;
  youtubeLinks?: { url: string; title: string; }[];
  kahootUrl?: string;
  quiz?: QuizQuestion[];
  summary?: string;
  sections?: MemoFicheSection[];
  memoSections?: MemoFicheSection[];
  media?: Media[];
  sourceText?: string;
  level?: string;
  knowledgeBaseUrl?: string;
  isFree?: boolean;
  customSections?: MemoFicheSection[];

  // Dispositifs médicaux
  casComptoir?: string;
  objectifsConseil?: string;
  pathologiesConcernees?: string;
  interetDispositif?: string;
  beneficesSante?: string;
  dispositifsAConseiller?: string;
  reponsesObjections?: string;
  pagesSponsorisees?: string;
  referencesBibliographiquesDM?: string[];

  // Ordonnances
  ordonnance?: string[];
  analyseOrdonnance?: string[];
  conseilsTraitement?: { medicament: string; conseils: string[] }[] | string[];
  informationsMaladie?: string[];
  conseilsHygieneDeVie?: string[];
  conseilsAlimentaires?: string[];
  ventesAdditionnelles?: string[];
}

export type MemoFiche = CaseStudy;

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Taxonomy {
  pedagogical: string[];
  clinical: string[];
}

export interface Appointment {
  _id: ObjectId | string;
  clientId: ObjectId;
  clientName?: string;
  date: Date;
  title: string;
  notes?: string;
  createdAt: Date;
}
