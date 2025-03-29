export interface Item {
    item_id: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    image_url: string;
    created_at: string;
}

export interface CreateItemRequest {
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    image: string; // base64 encoded image
}

export interface CreateItemResponse {
    item_id: string;
    secret_key: string;
    secret_url_path: string; // Changed from secret_url
}

export interface Location {
    latitude: number;
    longitude: number;
}