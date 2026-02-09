import clientPromise from './mongo.js';
import { User } from '../types.js';

export enum AnalyticEvent {
  USER_LOGIN = 'USER_LOGIN',
  FICHE_VIEW = 'FICHE_VIEW',
}

interface EventPayload {
  type: AnalyticEvent;
  userId?: string;
  details?: Record<string, any>;
}

export async function trackEvent(payload: EventPayload) {
  try {
    const client = await clientPromise;
    const db = client.db('pharmia');
    const analyticsCollection = db.collection('analytics_events');

    await analyticsCollection.insertOne({
      ...payload,
      timestamp: new Date(),
    });
  } catch (error) {
    // Ne pas bloquer l'application si le suivi échoue
    console.error('Failed to track analytic event:', error);
  }
}
