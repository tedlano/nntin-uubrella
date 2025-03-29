import { CreateItemRequest, CreateItemResponse, Item } from '../types/item';

// Determine the API base URL from environment variables (set during build/deployment)
// Falls back to a default localhost URL for local development if VITE_API_URL is not set.
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'; // TODO: Update default if needed

/**
 * Sends a request to the backend API to create a new hidden item.
 * @param data - The item data to be created (title, description, location, base64 image).
 * @returns A promise that resolves with the API response (item_id, secret_key).
 * @throws An error if the API request fails or returns a non-OK status.
 */
export async function createItem(data: CreateItemRequest): Promise<CreateItemResponse> {
    const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST', // Use POST for creating resources
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data), // Send data as a JSON string
    });

    // Check if the response status indicates success (e.g., 200 OK)
    if (!response.ok) {
        // If not OK, try to parse the error message from the response body
        let errorMessage = 'Failed to create item';
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorMessage; // Use error message from backend if available
        } catch (e) {
            // Ignore if response body is not JSON or empty
        }
        // Throw an error to be caught by the calling component
        throw new Error(errorMessage);
    }

    // If response is OK, parse the JSON body and return it
    return response.json();
}

/**
 * Fetches the details of a specific hidden item from the backend API.
 * Requires the item ID and the secret key for authorization.
 * @param itemId - The unique ID of the item to fetch.
 * @param secretKey - The secret key required to access the item details.
 * @returns A promise that resolves with the item details.
 * @throws An error if the API request fails, the item is not found, or the key is invalid.
 */
export async function getItem(itemId: string, secretKey: string): Promise<Item> {
    // Construct the URL with item ID in the path and secret key as a query parameter
    const response = await fetch(`${API_BASE_URL}/items/${itemId}?key=${secretKey}`, {
        method: 'GET', // Use GET for retrieving resources
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Check if the response status indicates success
    if (!response.ok) {
        let errorMessage = 'Failed to fetch item';
        try {
            const errorBody = await response.json();
            errorMessage = errorBody.error || errorMessage;
        } catch (e) {
            // Ignore JSON parsing errors
        }
        // Throw specific errors based on status code if possible, otherwise generic
        if (response.status === 404) {
            throw new Error('Item not found');
        } else if (response.status === 403) {
            throw new Error('Invalid secret key');
        }
        throw new Error(errorMessage);
    }

    // If response is OK, parse and return the item data
    return response.json();
}