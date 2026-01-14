import { ObjectId } from 'mongodb';

export enum UserRole {
  VISITEUR = 'VISITEUR',
  APPRENANT = 'APPRENANT',
  FORMATEUR = 'FORMATEUR',
  ADMIN = 'ADMIN',
  ADMIN_WEBINAR = 'ADMIN_WEBINAR',
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

export interface SimulationResult {
    date: Date;
    score: number;
    feedback: string;
    topic: string;
    conversationHistory: ChatHistoryMessage[];
    recommendedFiches?: { _id: string; title: string; }[];
}

export interface QuizHistoryEntry {
  quizId: string;
  score: number;
  completedAt: Date;
  answers?: any[]; // Detailed answers could be typed later if needed
}

export interface ChatHistoryMessage {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp?: Date;
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
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  trialExpiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  readFiches?: { ficheId: string; readAt: Date; }[];
  quizHistory?: QuizHistoryEntry[];
  simulationHistory?: SimulationResult[];
  activeSimulation?: {
    topic: string;
    messages: ChatHistoryMessage[];
    lastUpdated: Date;
  };
  viewedMediaIds?: string[];
  phoneNumber?: string;
  status?: ClientStatus;
  assignedTo?: ObjectId;
  companyName?: string;
  lastContactDate?: Date;
  notes?: string;
  teamSize?: number;
  groupId?: ObjectId | string;
  objectifs?: string;
  CA?: number;
  zone?: string;
  secteur?: string;
  paymentProofUrl?: string;
  masterClassCredits?: number;
}

export interface Group {
  _id: ObjectId | string;
  name: string;
  pharmacistIds: (ObjectId | string)[]; // Changé de pharmacistId à pharmacistIds (tableau)
  preparatorIds: (ObjectId | string)[];
  assignedFiches: { ficheId: string; assignedAt: Date; }[];
  managedBy?: ObjectId | string;
  subscriptionAmount?: number;
  instruction?: string;
  instructionDate?: Date;
  primaryMemoFicheId?: ObjectId | string;
  instructionFiches?: (ObjectId | string)[];
  dailyBriefing?: {
    script: string;
    date: Date;
    actions?: { label: string; url: string; }[];
    audioUrl?: string;
  };
  planning?: GroupAssignment[];
  isPlanningEnabled?: boolean;
}

export interface GroupAssignment {
  ficheId: string;
  startDate: Date;
  endDate?: Date;
  active: boolean;
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
  type?: 'maladie' | 'pharmacologie' | 'dermocosmetique' | 'le-medicament' | 'dispositifs-medicaux' | 'ordonnances' | 'communication' | 'savoir';
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

  // New fields for "Le médicament" manual generator
  youtubeExplainerUrl?: string;
  infographicImageUrl?: string;
  pdfSlideshowUrl?: string;

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

export enum WebinarTimeSlot {
    MORNING = '09:00',
    LATE_MORNING = '11:00',
    AFTERNOON = '13:30',
    EVENING = '15:30',
    PHARMIA_TUESDAY = 'Mardi 11:00',
    PHARMIA_FRIDAY = 'Vendredi 13:30 (Replay)',
}

export enum WebinarStatus {
    LIVE = 'LIVE',
    UPCOMING = 'UPCOMING',
    PAST = 'PAST',
    REGISTRATION_CLOSED = 'REGISTRATION_CLOSED',
}

export enum WebinarGroup {
    CROP_TUNIS = 'CROP Tunis',
    PHARMIA = 'PharmIA',
    MASTER_CLASS = 'MASTER CLASS OFFICINE 2026',
}

export enum ProductType {
    WEBINAR = 'WEBINAR',
    PACK = 'PACK',
}

export interface Pack {
    id: string;
    name: string;
    description: string;
    credits: number;
    priceHT: number;
    priceTTC?: number;
    badge?: string;
}

export interface WebinarResource {
  type: 'Replay' | 'Diaporama' | 'Infographie' | 'pdf' | 'link' | 'youtube';
  source: string;
  title?: string;
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
    userId: ObjectId | string | Partial<User>;
    status: 'PENDING' | 'PAYMENT_SUBMITTED' | 'CONFIRMED';
    proofUrl?: string;
    registeredAt: Date;
    timeSlots?: WebinarTimeSlot[];
  }[];
  createdAt: Date;
  updatedAt: Date;
  group: WebinarGroup;
  price?: number;
  registrationStatus?: 'PENDING' | 'PAYMENT_SUBMITTED' | 'CONFIRMED';
  calculatedStatus?: WebinarStatus; // Nouveau champ pour le statut calculé
  resources?: WebinarResource[]; // New field for media resources
  publicationStatus?: 'DRAFT' | 'PUBLISHED';
}

export interface Image {
  _id: ObjectId | string;
  name: string;
  theme: string;
  url: string;
  createdAt: Date;
}

export enum OrderStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAYMENT_SUBMITTED = 'PAYMENT_SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
}

export interface CartItem {
  type: ProductType; // 'WEBINAR' or 'PACK'
  id: string; // webinarId or packId
  webinarId?: string; // Kept for compatibility/clarity
  packId?: string;
  slots?: WebinarTimeSlot[];
  title: string;
  date?: Date; // Only for webinars
  group: WebinarGroup; // Critical for mixed-cart check
  price?: number; // Added price field
}

export interface Order {
  _id: ObjectId | string;
  userId: ObjectId | string;
  items: {
    type?: ProductType; // Optional for backward compatibility (default: WEBINAR)
    webinarId?: ObjectId | string; // Kept for backward compatibility
    productId?: string; // Generic ID (webinarId or packId)
    slots?: WebinarTimeSlot[];
    packId?: string; // Specific if it's a pack
  }[];
  totalAmount: number;
  paymentProofUrl?: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rating {
  _id?: ObjectId;
  score: number;
  userId: ObjectId | string;
  createdAt: Date;
  newsletterId?: ObjectId | string; // Optional: Link to the newsletter that prompted the survey
}

export interface AdCampaign {
  _id?: ObjectId | string;
  id: string; // internal string id like 'doliprane-focus'
  keywords: string[];
  sponsorName: string;
  productName: string;
  description: string;
  imageUrl?: string;
  link: string;
  active: boolean;
  isPremium?: boolean;
  impressions?: number;
  clicks?: number;
}