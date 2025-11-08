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

export enum MemoFicheStatus {
  DRAFT = 'Draft',
  PUBLISHED = 'Published',
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
  readFiches?: { ficheId: string; readAt: Date; }[];
  quizHistory?: any[];
  viewedMediaIds?: string[];
  phoneNumber?: string;
  status?: ClientStatus;
  assignedTo?: ObjectId;
  companyName?: string;
  lastContactDate?: Date;
  notes?: string;
  teamSize?: number;
  groupId?: ObjectId | string;
}

export interface Group {
  _id: ObjectId | string;
  name: string;
  pharmacistId: ObjectId | string;
  preparatorIds: (ObjectId | string)[];
  assignedFiches: { ficheId: string; assignedAt: Date; }[];
  pharmacistName?: string;
  pharmacistCreatedAt?: Date;
  pharmacistSubscriptionEndDate?: Date;
  pharmacistPlanName?: string;
  pharmacistHasActiveSubscription?: boolean;
  managedBy?: ObjectId | string;
  subscriptionAmount?: number;
  instruction?: string;
  instructionDate?: Date;
  primaryMemoFicheId?: ObjectId | string;
  instructionFiches?: (ObjectId | string)[];
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

export interface MemoFicheSectionContent {
  type: 'text' | 'image' | 'video';
  value: string;
}

export interface MemoFicheSection {
  id?: string;
  title: string;
  content: MemoFicheSectionContent[];
}

export interface Media {
  type: 'image' | 'video';
  url: string;
  caption?: string;
}

export interface CaseStudy {
  _id: ObjectId | string;
  id: string;
  type?: 'maladie' | 'pharmacologie' | 'dermocosmetique' | 'exhaustive' | 'dispositifs-medicaux' | 'ordonnances' | 'communication' | 'savoir';
  title: string;
  shortDescription: string;
  theme: string;
  system: string;
  creationDate: string;
  isLocked?: boolean;
  patientSituation: string | MemoFicheSection;
  keyQuestions: string[];
  pathologyOverview: string | MemoFicheSection;
  redFlags: string[];
  mainTreatment?: string[];
  associatedProducts?: string[];
  lifestyleAdvice?: string[];
  dietaryAdvice?: string[];
  references: string[];
  recommendations?: {
    mainTreatment?: string[];
    associatedProducts?: string[];
    lifestyleAdvice?: string[];
    dietaryAdvice?: string[];
  };
  keyPoints: string[];
  glossary: GlossaryTerm[];
  flashcards: Flashcard[];
  coverImageUrl?: string;
  coverImagePosition?: 'top' | 'middle' | 'bottom';
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
  sectionOrder?: string[];
  status: MemoFicheStatus; // New status field

  // Dispositifs médicaux
  casComptoir?: string | MemoFicheSection;
  objectifsConseil?: string | MemoFicheSection;
  pathologiesConcernees?: string | MemoFicheSection;
  interetDispositif?: string | MemoFicheSection;
  beneficesSante?: string | MemoFicheSection;
  dispositifsAConseiller?: string | MemoFicheSection;
  reponsesObjections?: string | MemoFicheSection;
  pagesSponsorisees?: string | MemoFicheSection;
  referencesBibliographiquesDM?: string[];

  // Ordonnances
  ordonnance?: string[];
  analyseOrdonnance?: string[];
  conseilsTraitement?: { medicament: string; conseils: string[] }[] | string[];
  informationsMaladie?: string[];
  conseilsHygieneDeVie?: string[];
  conseilsAlimentaires?: string[];
  ventesAdditionnelles?: {
    complementsAlimentaires?: string[];
    accessoires?: string[];
    dispositifs?: string[];
    cosmetiques?: string[];
  } | string[];
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

export interface ImageTheme {
  _id: ObjectId | string;
  name: string;
  category: 'Thèmes Pédagogiques' | 'Systèmes et Organes';
}

export enum WebinarGroup {
  CROP_TUNIS = 'CROP Tunis',
  PHARMIA = 'PharmIA',
}

export interface Webinar {
  _id: ObjectId | string;
  title: string;
  description: string;
  date: Date;
  presenter: string;
  imageUrl?: string;
  googleMeetLink?: string;
  registrationLink?: string;
  attendees: { 
    userId: ObjectId | string;
    status: 'PENDING' | 'PAYMENT_SUBMITTED' | 'CONFIRMED';
    proofUrl?: string;
    registeredAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  group: WebinarGroup;
  registrationStatus?: 'PENDING' | 'PAYMENT_SUBMITTED' | 'CONFIRMED';
}

export interface Image {
  _id: ObjectId | string;
  name: string;
  theme: string;
  url: string;
  createdAt: Date;
}