export type Visibility = 'PUBLIC' | 'PRIVATE';

export interface Item {
    item_id: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    image_url: string;
    created_at: string;
    visibility: Visibility; // Added
    category?: string;      // Added optional category
    // Note: secret_key is intentionally omitted here as it shouldn't be stored/passed around in the frontend model
}

export interface CreateItemRequest {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    image: string; // base64 encoded image
    visibility?: Visibility; // Added optional visibility (backend defaults to PRIVATE)
    category?: string;      // Added optional category (required by backend if visibility is PUBLIC)
}

export interface CreateItemResponse {
    item_id: string;
    // These are only returned if the created item is PRIVATE
    secret_key?: string;
    secret_url_path?: string;
}

export interface Location {
    latitude: number;
    longitude: number;
}

// Type for the summary data returned by the getPublicItems endpoint
export interface PublicItemSummary {
    item_id: string;
    title: string;
    latitude: number;
    longitude: number;
    category?: string; // Category is expected for public items
}