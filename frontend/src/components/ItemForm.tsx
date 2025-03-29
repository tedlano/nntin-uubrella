import React, { useState, FormEvent, useCallback } from 'react'; // Import useCallback
import { createItem } from '../utils/api';
import { Location, CreateItemResponse } from '../types/item';
import Map from './Map';
import ImageUpload from './ImageUpload';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

/**
 * Component representing the form used to create (hide) a new item.
 * Handles user input, validation, submission, and success/error states.
 * Includes integration with Map and ImageUpload components.
 */
export default function ItemForm() {
    // Form field states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null);
    const [image, setImage] = useState<string | null>(null); // Base64 image string or null

    // UI/Flow states
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<CreateItemResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageResetTrigger, setImageResetTrigger] = useState(0); // State for triggering ImageUpload reset

    /**
     * Memoized callback for handling location selection from the Map component.
     * Prevents unnecessary re-renders of the Map component if this function
     * reference remains stable.
     */
    const handleLocationSelect = useCallback((selectedLocation: Location | null) => {
        setLocation(selectedLocation);
    }, []); // Empty dependency array means this function is created once

    /**
     * Memoized callback for handling image selection/clearing from ImageUpload.
     */
    const handleImageSelect = useCallback((selectedImage: string | null) => {
        setImage(selectedImage);
    }, []);

    /**
     * Handles the form submission process.
     */
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        // Don't reset success here, only after clicking "Hide Another Item"

        // --- Form Validation ---
        if (!title.trim()) {
            setError('Title is required');
            return;
        }
        if (!description.trim()) {
            setError('Description is required');
            return;
        }
        if (!location) {
            setError('Please select a location on the map');
            return;
        }
        if (!image) {
            setError('Please upload an image');
            return;
        }

        // --- API Call ---
        try {
            setIsSubmitting(true);
            const response = await createItem({
                title: title.trim(),
                description: description.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
                image, // Pass the Base64 image string
            });

            // --- Success Handling ---
            setSuccess(response); // Show success message
            // Reset form fields
            setTitle('');
            setDescription('');
            setLocation(null);
            setImage(null); // Reset image state in this component
            setImageResetTrigger(prev => prev + 1); // Increment trigger to reset ImageUpload component

        } catch (err) {
            // --- Error Handling ---
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            // --- Cleanup ---
            setIsSubmitting(false);
        }
    };

    /**
     * Handles copying the generated secret URL to the clipboard.
     */
    const handleCopy = () => {
        if (success) {
            const url = `${window.location.origin}${success.secret_url_path}`; // Use path from response
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    /**
     * Resets the form to allow hiding another item.
     */
    const handleHideAnother = () => {
        setSuccess(null); // Hide success message
        setCopied(false); // Reset copied state
        setError(null); // Clear any previous errors
        // Form fields are already reset on successful submit,
        // ImageUpload is reset via resetTrigger.
    };

    // --- Render Logic ---
    // Success View
    if (success) {
        const url = `${window.location.origin}${success.secret_url_path}`; // Use path from response
        return (
            <div className="card">
                <div className="success-message p-6"> {/* Added padding */}
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Item Hidden Successfully!</h2>
                    <p className="text-gray-600 mb-6">
                        Share this secret URL with the item's owner (click to copy):
                    </p>
                    <div
                        className="secret-url relative bg-gray-100 p-4 rounded-md cursor-pointer group hover:bg-gray-200 transition-colors"
                        onClick={handleCopy}
                        title="Click to copy URL"
                    >
                        <p className="break-all text-sm text-gray-700 pr-8"> {/* Increased padding for icon */}
                            {url}
                        </p>
                        <div className="absolute top-1/2 right-2 transform -translate-y-1/2"> {/* Centered icon */}
                            {copied ? (
                                <CheckIcon className="h-5 w-5 text-green-500" />
                            ) : (
                                <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleHideAnother} // Use dedicated handler
                        className="btn btn-primary mt-6 w-full" // Full width button
                    >
                        Hide Another Item
                    </button>
                </div>
            </div>
        );
    }

    // Form View
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title Input */}
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
                    required // Added basic HTML5 validation
                />
            </div>

            {/* Description Input */}
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
                    required // Added basic HTML5 validation
                />
            </div>

            {/* Location Map */}
            <div className="form-group">
                <label className="form-label">
                    Location {location ? '(Selected)' : '(Required)'}
                </label>
                <p className="mb-2 text-sm text-gray-500">
                    Click on the map to select the item's location or use the "Log GPS Location" button.
                </p>
                <Map
                    location={location ?? undefined}
                    onLocationSelect={handleLocationSelect} // Use memoized callback
                    className="w-full h-64 rounded-lg" // Added height and rounded corners
                />
            </div>

            {/* Image Upload */}
            <div className="form-group">
                <label className="form-label">
                    Photo {image ? '(Selected)' : '(Required)'}
                </label>
                <ImageUpload
                    onImageSelect={handleImageSelect} // Use memoized callback
                    className="w-full"
                    resetTrigger={imageResetTrigger} // Pass reset trigger state
                />
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isSubmitting || !location || !image} // Disable if submitting or required fields missing
                className="btn btn-primary w-full disabled:opacity-50" // Use Tailwind disabled style
            >
                {isSubmitting ? 'Creating...' : 'Hide Item'}
            </button>
        </form>
    );
}