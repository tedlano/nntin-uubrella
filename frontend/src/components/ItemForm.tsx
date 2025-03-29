import React, { useState, FormEvent } from 'react';
import { createItem } from '../utils/api';
import { Location, CreateItemResponse } from '../types/item';
import Map from './Map';
import ImageUpload from './ImageUpload';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

/**
 * Component representing the form used to create (hide) a new item.
 * It handles user input for title, description, location (via Map component),
 * and image (via ImageUpload component). It manages form state, validation,
 * submission to the backend API, and displays success/error messages.
 */
export default function ItemForm() {
    // Form field states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null); // Selected location from Map component
    const [image, setImage] = useState<string | null>(null);         // Base64 image string from ImageUpload component
    // UI/Flow states
    const [error, setError] = useState<string | null>(null);         // Stores any submission or validation error messages
    const [success, setSuccess] = useState<CreateItemResponse | null>(null); // Stores the successful API response (item_id, secret_key)
    const [isSubmitting, setIsSubmitting] = useState(false);         // Tracks if the form is currently being submitted
    const [copied, setCopied] = useState(false);                     // Tracks if the success URL has been copied

    /**
     * Handles the form submission process.
     * Validates inputs, calls the backend API, handles success/error states,
     * and resets the form upon success.
     */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault(); // Prevent default form submission
        // Reset error/success states on new submission attempt
        setError(null);
        setSuccess(null);

        // --- Form Validation ---
        // Basic validation checks for required fields.
        if (!title.trim()) {
            setError('Title is required');
            return; // Stop submission if validation fails
        }
        if (!description.trim()) {
            setError('Description is required');
            return;
        }
        if (!location) {
            setError('Please select a location on the map');
            return;
        }
        if (!image) { // Image is expected as a Base64 string
            setError('Please upload an image');
            return;
        }

        // --- API Call ---
        try {
            setIsSubmitting(true); // Set loading state
            // Call the API utility function to create the item.
            const response = await createItem({
                title: title.trim(), // Trim whitespace from text inputs
                description: description.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
                image, // Pass the Base64 image string
            });
            // --- Success Handling ---
            setSuccess(response); // Store the response containing item_id and secret_key
            // Reset form fields to allow for another submission
            setTitle('');
            setDescription('');
            setLocation(null);
            setImage(null); // Note: This doesn't clear the preview in ImageUpload, might need explicit reset there if desired.
        } catch (err) {
            // --- Error Handling ---
            // Set error message for display
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            // --- Cleanup ---
            setIsSubmitting(false); // Reset loading state regardless of success/failure
        }
    };

    /**
     * Handles copying the generated secret URL to the clipboard.
     * Provides visual feedback by changing the icon temporarily.
     */
    const handleCopy = () => {
        if (success) {
            // Construct the full URL using the response data
            const url = `${window.location.origin}/items/${success.item_id}?key=${success.secret_key}`;
            // Use the Clipboard API to copy the text
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true); // Set state to show feedback (e.g., checkmark icon)
                // Reset the feedback icon after a short delay
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // --- Render Logic ---
    // If submission was successful, show the success message and URL
    if (success) {
        const url = `${window.location.origin}/items/${success.item_id}?key=${success.secret_key}`;
        return (
            <div className="card">
                <div className="success-message">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Item Hidden Successfully!</h2>
                    <p className="text-gray-600 mb-6">
                        Share this secret URL with the item's owner (click to copy):
                    </p>
                    <div
                        className="secret-url relative bg-gray-100 p-4 rounded-md cursor-pointer group hover:bg-gray-200 transition-colors"
                        onClick={handleCopy}
                        title="Click to copy URL"
                    >
                        <p className="break-all text-sm text-gray-700 pr-6"> {/* Adjusted padding for smaller icon */}
                            {url}
                        </p>
                        {/* Position container for the icon */}
                        <div className="absolute top-1 right-1"> {/* Closer to the corner */}
                            {copied ? (
                                <CheckIcon className="h-3 w-3 text-green-500" />
                            ) : (
                                <ClipboardDocumentIcon className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setSuccess(null);
                            setCopied(false); // Reset copied state when hiding again
                        }}
                        className="btn btn-primary mt-6" // Added margin-top
                    >
                        Hide Another Item
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-group">
                <label htmlFor="title" className="form-label">
                    Title
                </label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                    placeholder="What did you find?"
                />
            </div>

            <div className="form-group">
                <label htmlFor="description" className="form-label">
                    Description
                </label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder="Describe the item and where exactly you hid it..."
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Location
                </label>
                <p className="mb-2 text-sm text-gray-500">
                    Click on the map to select the item's location or use the "Log GPS Location" button
                </p>
                <Map
                    location={location ?? undefined}
                    onLocationSelect={setLocation}
                    className="w-full"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Photo
                </label>
                <ImageUpload
                    onImageSelect={setImage}
                    className="w-full"
                />
            </div>

            {error && (
                <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isSubmitting}
                className={`btn btn-primary w-full ${isSubmitting ? 'disabled' : ''}`}
            >
                {isSubmitting ? 'Creating...' : 'Hide Item'}
            </button>
        </form>
    );
}