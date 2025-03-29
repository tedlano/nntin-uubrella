import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getItem } from '../utils/api';
import { Item } from '../types/item';
import Map from '../components/Map';

/**
 * Page component for displaying the details of a specific hidden item.
 * It fetches item data based on the ID and secret key from the URL,
 * handles loading and error states, and renders the item's title,
 * description, image, and map location.
 */
export default function ItemPage() {
    // Extract item ID from URL path parameters
    const { id } = useParams<{ id: string }>();
    // Extract secret key from URL query parameters
    const [searchParams] = useSearchParams();
    const secretKey = searchParams.get('key'); // The secret key required to view the item

    // State variables
    const [item, setItem] = useState<Item | null>(null); // Stores the fetched item data
    const [error, setError] = useState<string | null>(null); // Stores any error message during fetch
    const [isLoading, setIsLoading] = useState(true); // Tracks the loading state

    // Effect hook to fetch item data when the component mounts or id/secretKey changes
    useEffect(() => {
        // Define the async function to perform the fetch
        async function loadItem() {
            // Basic validation: Ensure ID and key are present in the URL
            if (!id || !secretKey) {
                setError('Invalid URL parameters.');
                setIsLoading(false);
                return; // Stop if parameters are missing
            }

            // --- API Call ---
            try {
                // Call the API utility function to fetch item data
                const itemData = await getItem(id, secretKey);
                setItem(itemData); // Store the fetched data in state
            } catch (err) {
                // --- Error Handling ---
                setError(err instanceof Error ? err.message : 'Failed to load item');
            } finally {
                // --- Cleanup ---
                setIsLoading(false); // Set loading to false regardless of success/error
            }
        }

        // Execute the loadItem function
        loadItem();
        // Dependency array: Re-run the effect if id or secretKey changes
    }, [id, secretKey]);

    // --- Conditional Rendering based on state ---

    // Display loading indicator while fetching data
    if (isLoading) {
        return (
            <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <div className="spinner"></div> {/* Simple CSS spinner */}
                    <p className="mt-4 text-gray-600">Loading item details...</p>
                </div>
            </div>
        );
    }

    // Display error message if fetching failed or item is not found
    if (error || !item) {
        return (
            <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {error || 'Item not found'} {/* Show specific error or generic message */}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        The item you're looking for might have been removed or the link is invalid.
                    </p>
                    <a
                        href="/"
                        className="btn btn-primary"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    // --- Render Item Details ---
    // This block renders only if loading is complete, there's no error, and item data exists.
    return (
        <div className="container py-6"> {/* Added padding */}
            <div className="card">
                {/* Item Title */}
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {item.title}
                </h1>

                {/* Item Description - preserve whitespace */}
                <p className="text-gray-600 mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                    {item.description}
                </p>

                {/* Item Image - responsive scaling */}
                <div className="image-preview mb-4">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-auto object-contain rounded" // Ensure image scales and has rounded corners
                    />
                </div>

                {/* Location Map - read-only */}
                <div className="mb-6">
                    {/* Location heading removed for cleaner UI */}
                    <Map
                        location={{
                            latitude: item.latitude,
                            longitude: item.longitude
                        }}
                        readOnly // Prevent interaction on the view page
                        className="w-full" // Ensure map takes full width
                    />
                </div>

                {/* Creation Date */}
                <div className="text-sm text-gray-500 text-center"> {/* Centered text */}
                    Hidden on {new Date(item.created_at).toLocaleDateString('en-CA', { // Use options for YYYY-MM-DD
                        year: 'numeric', month: '2-digit', day: '2-digit'
                    })}
                </div>
            </div>
        </div>
    );
}