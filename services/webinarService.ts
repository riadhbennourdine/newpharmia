
import { Webinar } from '../types';

const BASE_URL = '/api/webinars';

// Helper to create authorization headers
const createAuthHeaders = (token?: string | null): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};


// Helper to handle API responses
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

// Fetches all webinars, optionally filtered by group
export const fetchWebinars = async (token?: string | null, group?: string): Promise<Webinar[]> => {
    const url = group ? `${BASE_URL}?group=${group}` : BASE_URL;
    const response = await fetch(url, {
        headers: createAuthHeaders(token),
    });
    return handleResponse(response);
};

// Fetches webinars the currently authenticated user is registered for
export const fetchMyWebinars = async (token: string): Promise<Webinar[]> => {
    const response = await fetch(`${BASE_URL}/my-webinars`, {
        headers: createAuthHeaders(token),
    });
    return handleResponse(response);
};

// Updates the resources for a specific webinar
export const updateWebinarResources = async (webinarId: string, resources: { type: string; source: string }[], token: string): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/${webinarId}/resources`, {
        method: 'PUT',
        headers: createAuthHeaders(token),
        body: JSON.stringify({ resources }),
    });
    return handleResponse(response);
};

// --- Other potential service functions based on server/webinars.ts ---

// Fetches a single webinar by its ID
export const fetchWebinarById = async (id: string, token?: string | null): Promise<Webinar> => {
    const response = await fetch(`${BASE_URL}/${id}`, {
        headers: createAuthHeaders(token),
    });
    return handleResponse(response);
};

// Registers the current user for a webinar
export const registerForWebinar = async (webinarId: string, timeSlots: string[], token: string): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/${webinarId}/register`, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify({ timeSlots }),
    });
    return handleResponse(response);
};

// Submits proof of payment for a webinar
export const submitPaymentProof = async (webinarId: string, proofUrl: string, token: string): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/${webinarId}/submit-payment`, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify({ proofUrl }),
    });
    return handleResponse(response);
};

// Admin: Confirms payment for an attendee
export const confirmPayment = async (webinarId: string, userId: string, token: string): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/${webinarId}/attendees/${userId}/confirm`, {
        method: 'POST',
        headers: createAuthHeaders(token),
    });
    return handleResponse(response);
};
