import { CreateItemRequest, CreateItemResponse, Item } from '../types/item';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function createItem(data: CreateItemRequest): Promise<CreateItemResponse> {
    const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create item');
    }

    return response.json();
}

export async function getItem(itemId: string, secretKey: string): Promise<Item> {
    const response = await fetch(`${API_BASE_URL}/items/${itemId}?key=${secretKey}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch item');
    }

    return response.json();
}