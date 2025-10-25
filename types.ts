import { ObjectId } from 'mongodb';

export enum MemoFicheType {
  VISITEUR = 'VISITEUR',
  APPRENANT = 'APPRENANT',
  FORMATEUR = 'FORMATEUR',
  ADMIN = 'ADMIN',
  PHARMACIEN = 'PHARMACIEN',
  PREPARATEUR = 'PREPARATEUR',
  DERMO_COSMETIQUE = 'dermocosmetique',
  DISPOSITIFS_MEDICAUX = 'dispositifs-medicaux',
  ORDONNANCES = 'ordonnances',
  COMMUNICATION = 'communication',
  MICRONUTRITION = 'micronutrition',
}