import {
  CreateItemRequest,
  CreateItemResponse,
  Item,
  PublicItemSummary,
} from "../types/item"; // Added PublicItemSummary

// Determine the API base URL from environment variables (set during build/deployment)
// Falls back to a default localhost URL for local development if VITE_API_URL is not set.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"; // TODO: Update default if needed

/**
 * Sends a request to the backend API to create a new hidden item.
 * @param data - The item data including title, description, location, image, and optionally visibility/category.
 * @returns A promise that resolves with the API response (item_id, and optionally secret_key/secret_url_path for private items).
 * @throws An error if the API request fails or returns a non-OK status.
 */
export async function createItem(
  data: CreateItemRequest,
): Promise<CreateItemResponse> {
  const response = await fetch(`${API_BASE_URL}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data), // Sends visibility and category if present in data object
  });

  if (!response.ok) {
    let errorMessage = "Failed to create item";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch (e) {
      /* Ignore JSON parsing errors */
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetches the details of a specific hidden item from the backend API.
 * Requires the item ID. If the item is private, the secret key must be provided as a query parameter.
 * @param itemId - The unique ID of the item to fetch.
 * @param secretKey - The secret key (only required and checked by backend for private items).
 * @returns A promise that resolves with the full item details.
 * @throws An error if the API request fails, the item is not found, or the key is invalid/missing for a private item.
 */
export async function getItem(
  itemId: string,
  secretKey?: string,
): Promise<Item> {
  // Made secretKey optional here
  // Construct URL, conditionally add key parameter if provided
  let url = `${API_BASE_URL}/items/${itemId}`;
  if (secretKey) {
    url += `?key=${encodeURIComponent(secretKey)}`; // Ensure key is URL encoded
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch item";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch (e) {
      /* Ignore JSON parsing errors */
    }

    // Throw specific errors based on status code
    if (response.status === 404) {
      throw new Error("Item not found");
    } else if (response.status === 403) {
      throw new Error("Invalid secret key");
    } else if (response.status === 401) {
      // Handle missing key for private item
      throw new Error("Secret key is required for this item");
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Fetches a list of publicly visible items.
 * @returns A promise that resolves with an object containing a list of public item summaries.
 * @throws An error if the API request fails.
 */
export async function getPublicItems(): Promise<{
  items: PublicItemSummary[];
}> {
  const response = await fetch(`${API_BASE_URL}/public/items`, {
    // Use the new endpoint
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch public items";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch (e) {
      /* Ignore JSON parsing errors */
    }
    throw new Error(errorMessage);
  }

  // Expect response format: { "items": [...] }
  return response.json();
}

/**
 * Fetches all items (admin).
 * @returns A promise that resolves with an object containing a list of all items.
 * @param adminKey - The admin key required for authorization.
 * @returns A promise that resolves with an object containing a list of all items.
 * @throws An error if the API request fails or authorization fails.
 */
export async function getAllItems(
  adminKey: string,
): Promise<{ items: Item[] }> {
  if (!adminKey) {
    throw new Error("Admin key is required to fetch all items.");
  }
  const url = `${API_BASE_URL}/admin/items?admin_key=${encodeURIComponent(adminKey)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Example
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch all items (admin)";
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch (e) {
      /* Ignore JSON parsing errors */
    }
    // TODO: Handle specific auth errors (401, 403)
    throw new Error(errorMessage);
  }

  // Expect response format: { "items": [...] }
  return response.json();
}

/**
 * Deletes a specific item (admin).
 * @param itemId - The unique ID of the item to delete.
 * @param adminKey - The admin key required for authorization.
 * @returns A promise that resolves when the deletion is successful.
 * @throws An error if the API request fails or authorization fails.
 */
export async function deleteItem(
  itemId: string,
  adminKey: string,
): Promise<void> {
  if (!adminKey) {
    throw new Error("Admin key is required to delete items.");
  }
  // Note: The delete endpoint is /items/{id}, not /admin/items/{id} based on CDK
  const url = `${API_BASE_URL}/items/${itemId}?admin_key=${encodeURIComponent(adminKey)}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      // 'Authorization': 'Bearer YOUR_ADMIN_TOKEN' // Example
    },
  });

  if (!response.ok) {
    let errorMessage = `Failed to delete item ${itemId}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorMessage;
    } catch (e) {
      /* Ignore JSON parsing errors */
    }
    // TODO: Handle specific auth errors (401, 403) or not found (404)
    throw new Error(errorMessage);
  }

  // DELETE requests often return 200/204 No Content on success, no body needed
  return;
}
