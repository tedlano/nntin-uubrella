import React, { useState, FormEvent } from 'react';
import { createItem } from '../utils/api';
import { Location, CreateItemResponse } from '../types/item';
import Map from './Map';
import ImageUpload from './ImageUpload';
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

export default function ItemForm() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<CreateItemResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false); // State for copy feedback

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validate form
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

        try {
            setIsSubmitting(true);
            const response = await createItem({
                title: title.trim(),
                description: description.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
                image,
            });
            setSuccess(response);
            // Reset form
            setTitle('');
            setDescription('');
            setLocation(null);
            setImage(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (success) {
            const url = `${window.location.origin}/items/${success.item_id}?key=${success.secret_key}`;
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
            });
        }
    };

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