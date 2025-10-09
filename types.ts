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
  _id: string; // MongoDB's ObjectId as a string
  username?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: UserRole;
  passwordHash?: string; // Only on server-side, optional on client
  profileIncomplete?: boolean;
  city?: string; // For pharmacists
  pharmacistId?: string; // For preparators, string representation of ObjectId
  hasActiveSubscription?: boolean;
  planName?: string;
  subscriptionEndDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  readFicheIds?: string[];
  quizHistory?: any[];
  viewedMediaIds?: string[];
  phoneNumber?: string;

  // CRM Fields
  status?: ClientStatus;
  assignedTo?: string; // User ID of the admin/formateur
  companyName?: string; // Pharmacy name
  lastContactDate?: Date;
  notes?: string;
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
  _id: string;
  id: string; // Kept for compatibility with some components, but _id is primary
  type?: 'maladie' | 'pharmacologie' | 'dermocosmetique' | 'exhaustive';
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
  youtubeUrl?: string;
  kahootUrl?: string;

  quiz?: QuizQuestion[];

  // For generator and editor
  summary?: string;
  sections?: MemoFicheSection[];
  memoSections?: MemoFicheSection[]; // Used by new editor
  taxonomies?: {
    pedagogical: string;
    clinical: string;
  };
  
  // New fields from new editor
  media?: Media[];
  sourceText?: string;
  level?: string;
  knowledgeBaseUrl?: string;
  isFree?: boolean;
  customSections?: MemoFicheSection[];
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
  _id: string;
  clientId: string; // or prospectId
  clientName?: string;
  date: Date;
  title: string;
  notes?: string;
  createdAt: Date;
}