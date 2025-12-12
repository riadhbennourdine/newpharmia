
import { Order, WebinarTimeSlot, ProductType } from '../types';

const BASE_URL = '/api/orders';

// Helper to create authorization headers
const createAuthHeaders = (token: string): HeadersInit => {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Helper to handle API responses
const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
};

export interface CartItem {
    type?: ProductType;
    webinarId?: string;
    packId?: string;
    slots?: WebinarTimeSlot[];
}

export const createOrder = async (items: CartItem[], token: string): Promise<{ message: string; orderId: string; totalAmount: number }> => {
    const response = await fetch(`${BASE_URL}/checkout`, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify({ items }),
    });
    return handleResponse(response);
};

export const fetchOrder = async (orderId: string, token: string): Promise<Order> => {
    const response = await fetch(`${BASE_URL}/${orderId}`, {
        headers: createAuthHeaders(token),
    });
    return handleResponse(response);
};

export const submitOrderPayment = async (orderId: string, proofUrl: string, token: string): Promise<{ message: string }> => {
    const response = await fetch(`${BASE_URL}/${orderId}/submit-payment`, {
        method: 'POST',
        headers: createAuthHeaders(token),
        body: JSON.stringify({ proofUrl }),
    });
    return handleResponse(response);
};
