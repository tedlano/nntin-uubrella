import React, { useState, FormEvent, useCallback } from 'react';
import { createItem } from '../utils/api';
import { Location, CreateItemResponse, Visibility } from '../types/item'; // Import Visibility
import Map from './Map';
import ImageUpload from './ImageUpload';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

// Define categories for public items
const PUBLIC_CATEGORIES = [
    "Community Umbrella",
    "Shared Tool",
    "Street Art",
    "Public Restroom",
    "Water Fountain",
    "Little Free Library",
    "Other Public Item"
];

/**
 * Component representing the form used to create (hide) a new item.
 * Handles user input, validation, submission, and success/error states.
 * Allows setting item visibility (PUBLIC/PRIVATE) and category (for PUBLIC).
 */
export default function ItemForm() {
    // Form field states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false); // New state for visibility checkbox
    const [category, setCategory] = useState(''); // New state for category dropdown

    // UI/Flow states
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<CreateItemResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageResetTrigger, setImageResetTrigger] = useState(0);

    const handleLocationSelect = useCallback((selectedLocation: Location | null) => {
        setLocation(selectedLocation);
    }, []);

    const handleImageSelect = useCallback((selectedImage: string | null) => {
        setImage(selectedImage);
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // --- Form Validation ---
        if (!title.trim()) { setError('Title is required'); return; }
        if (!description.trim()) { setError('Description is required'); return; }
        if (!location) { setError('Please select a location on the map'); return; }
        if (!image) { setError('Please upload an image'); return; }
        // Validate category if item is public
        if (isPublic && !category) { setError('Please select a category for the public item'); return; }

        // --- API Call ---
        try {
            setIsSubmitting(true);
            const visibility: Visibility = isPublic ? 'PUBLIC' : 'PRIVATE';
            const payload = {
                title: title.trim(),
                description: description.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
                image,
                visibility, // Add visibility
                // Add category only if public
                ...(isPublic && { category: category })
            };

            const response = await createItem(payload);

            // --- Success Handling ---
            setSuccess(response); // Store response (contains item_id, maybe secret info)
            // Reset form fields
            setTitle('');
            setDescription('');
            setLocation(null);
            setImage(null);
            setIsPublic(false); // Reset visibility checkbox
            setCategory(''); // Reset category dropdown
            setImageResetTrigger(prev => prev + 1);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        // Only copy if success response exists and contains secret_url_path (i.e., was private)
        if (success?.secret_url_path) {
            const url = `${window.location.origin}${success.secret_url_path}`;
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    const handleHideAnother = () => {
        setSuccess(null);
        setCopied(false);
        setError(null);
    };

    // --- Render Logic ---
    // Success View
    if (success) {
        // Check if it was a private item by seeing if secret_url_path exists
        const wasPrivate = !!success.secret_url_path;
        const url = wasPrivate ? `${window.location.origin}${success.secret_url_path}` : null;

        return (
            <div className="card">
                <div className="success-message p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Item {wasPrivate ? 'Hidden' : 'Created'} Successfully!
                    </h2>
                    {wasPrivate && url ? (
                        <>
                            <p className="text-gray-600 mb-6">
                                Share this secret URL with the item's owner (click to copy):
                            </p>
                            <div
                                className="secret-url relative bg-gray-100 p-4 rounded-md cursor-pointer group hover:bg-gray-200 transition-colors"
                                onClick={handleCopy}
                                title="Click to copy URL"
                            >
                                <p className="break-all text-sm text-gray-700 pr-8">{url}</p>
                                <div className="absolute top-1/2 right-2 transform -translate-y-1/2">
                                    {copied ? (
                                        <CheckIcon className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <ClipboardDocumentIcon className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-gray-600 mb-6">
                            The public item has been created and will appear on the community map.
                            {/* Optional: Add link to community map page later */}
                        </p>
                    )}
                    <button
                        onClick={handleHideAnother}
                        className="btn btn-primary mt-6 w-full"
                    >
                        {wasPrivate ? 'Hide Another Item' : 'Create Another Item'}
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
                <label htmlFor="title" className="form-label">Title</label>
                <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="form-input" placeholder="What is the item?" required />
            </div>

            {/* Description Input */}
            <div className="form-group">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="form-textarea" placeholder="Describe the item and where exactly you hid/placed it..." required />
            </div>

            {/* Location Map */}
            <div className="form-group">
                <label className="form-label">Location {location ? '(Selected)' : '(Required)'}</label>
                <p className="mb-2 text-sm text-gray-500">Click on the map or use the button to set the location.</p>
                <Map location={location ?? undefined} onLocationSelect={handleLocationSelect} className="w-full h-64 rounded-lg" />
            </div>

            {/* Image Upload */}
            <div className="form-group">
                <label className="form-label">Photo {image ? '(Selected)' : '(Required)'}</label>
                <ImageUpload onImageSelect={handleImageSelect} className="w-full" resetTrigger={imageResetTrigger} />
            </div>

            {/* Visibility Options */}
            <div className="form-group space-y-3">
                <div className="flex items-center">
                    <input
                        id="isPublic"
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => {
                            setIsPublic(e.target.checked);
                            // Reset category if unchecking public
                            if (!e.target.checked) {
                                setCategory('');
                            }
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-900">
                        Make publicly visible on community map?
                    </label>
                </div>

                {/* Conditional Category Dropdown */}
                {isPublic && (
                    <div>
                        <label htmlFor="category" className="form-label sr-only">Category</label> {/* Screen reader only label */}
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="form-select"
                            required={isPublic} // Make required only if public
                        >
                            <option value="" disabled>-- Select a category --</option>
                            {PUBLIC_CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                )}
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
                disabled={isSubmitting || !location || !image || (isPublic && !category)} // Add category check to disabled logic
                className="btn btn-primary w-full disabled:opacity-50"
            >
                {isSubmitting ? 'Creating...' : (isPublic ? 'Create Public Item' : 'Hide Private Item')}
            </button>
        </form>
    );
}