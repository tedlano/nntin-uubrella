import {
  CreateItemRequest,
  CreateItemResponse,
  Item,
  PublicItemSummary,
  Location, // Added Location type import
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
 * @param adminKey - The admin key (optional, used for admin access).
 * @returns A promise that resolves with the full item details.
 * @throws An error if the API request fails, the item is not found, or the key is invalid/missing for a private item.
 */
export async function getItem(
  itemId: string,
  secretKey?: string | null, // Allow null
  adminKey?: string | null, // Add optional adminKey, allow null
): Promise<Item> {
  // Construct URL, conditionally add key or admin_key parameter
  let url = `${API_BASE_URL}/items/${itemId}`;
  const params = new URLSearchParams();
  if (secretKey) {
    params.append('key', secretKey);
  } else if (adminKey) {
    // Only add admin_key if secretKey is not present
    params.append('admin_key', adminKey);
  }
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
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


/**
 * Searches for a location using the OpenStreetMap Nominatim API.
 * Attempts structured search for US zip codes, falls back to free-form search.
 * Optionally biases results towards a given location hint.
 * @param query - The address, place name, or zip code to search for.
 * @param locationHint - Optional user location {latitude, longitude} to bias search results.
 * @returns A promise that resolves with the Location (lat, lon) or null if not found.
 * @throws An error if the API request fails.
 */
export async function searchLocation(
  query: string,
  locationHint?: Location | null // Add optional location hint parameter
): Promise<Location | null> {
  const trimmedQuery = query.trim();
  const params = new URLSearchParams({
    format: 'json',
    limit: '1',
  });

  // Basic check for US zip code (5 digits, optional -4)
  const usZipRegex = /^\d{5}(-\d{4})?$/;
  if (usZipRegex.test(trimmedQuery)) {
    // Use structured query for zip code
    params.set('postalcode', trimmedQuery);
    params.set('countrycodes', 'us'); // Bias towards US for zip codes
    console.log("Using structured zip code search");
  } else {
    // Use free-form query for other searches
    params.set('q', trimmedQuery);
    console.log("Using free-form search");
  }

  // Add viewbox bias if locationHint is provided
  if (locationHint) {
    // Define a bounding box size (e.g., 0.5 degrees latitude/longitude, adjust as needed)
    const viewBoxSize = 0.5;
    const left = locationHint.longitude - viewBoxSize / 2;
    const top = locationHint.latitude + viewBoxSize / 2;
    const right = locationHint.longitude + viewBoxSize / 2;
    const bottom = locationHint.latitude - viewBoxSize / 2;
    // Format: left,top,right,bottom
    params.set('viewbox', `${left},${top},${right},${bottom}`);
    params.set('bounded', '1'); // Ensure results are within the viewbox
    console.log(`Adding viewbox bias: ${params.get('viewbox')}`);
  }

  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
  console.log("Nominatim URL:", url);


  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // Nominatim requires a User-Agent, but browsers usually handle this.
        // If running server-side, you might need: 'User-Agent': 'YourAppName/1.0 (your-contact-email@example.com)'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API request failed with status ${response.status}`);
    }

    const results = await response.json();

    if (results && results.length > 0) {
      const firstResult = results[0];
      // Ensure lat and lon are numbers before returning
      const lat = parseFloat(firstResult.lat);
      const lon = parseFloat(firstResult.lon);
      if (!isNaN(lat) && !isNaN(lon)) {
        return { latitude: lat, longitude: lon };
      }
    }

    return null; // No results found or invalid data
  } catch (error) {
    console.error("Error searching location with Nominatim:", error);
    // Re-throw a more generic error for the UI
    throw new Error("Failed to search for location. Please try again.");
  }
}
