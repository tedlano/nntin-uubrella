import React, { useState, useRef, ChangeEvent } from 'react';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
    onImageSelect: (base64Image: string) => void;
    className?: string;
}

/**
 * Component for handling image uploads via file input or drag-and-drop.
 * Features include:
 * - Image preview
 * - File type validation (image/*)
 * - Client-side image compression using 'browser-image-compression' to ensure size limits.
 * - Conversion to Base64 format for the `onImageSelect` callback.
 * - Drag and drop support.
 * - Error display.
 */
export default function ImageUpload({ onImageSelect, className = '' }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null); // State for the image preview URL
    const [error, setError] = useState<string | null>(null);     // State for displaying errors
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setError(null);

        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        try {
            // --- Image Compression ---
            // Define options for the browser-image-compression library.
            const options = {
                maxSizeMB: 4.9,         // Target max file size (slightly below 5MB to be safe).
                maxWidthOrHeight: 1920, // Resize image if width or height exceeds 1920px.
                useWebWorker: true,     // Use web workers for faster compression off the main thread.
                initialQuality: 0.7     // Initial quality setting (0 to 1). Library adjusts from here.
            };

            // Perform the compression. This might take a moment.
            const compressedFile = await imageCompression(file, options);

            // --- Preview and Callback ---
            // Create a temporary URL for the compressed image preview.
            // Remember to revoke this URL later if needed to free up memory,
            // though in this component's lifecycle it might not be strictly necessary.
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            // Convert the compressed file to a Base64 string for the parent component.
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Pass the Base64 string to the parent component via the callback.
                onImageSelect(base64String);
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            // Handle errors during compression or file reading.
            setError('Error processing or compressing image');
            console.error('Error processing/compressing image:', err); // Keep console error for debugging
        }
    };

    /**
     * Handles the drop event for drag-and-drop functionality.
     * Extracts the dropped file and triggers the file selection process.
     */
    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Prevent default browser behavior (opening file)
        event.stopPropagation(); // Stop event bubbling

        const file = event.dataTransfer.files?.[0];
        // If a file is dropped and the input ref exists...
        if (file && fileInputRef.current) {
            // Create a new DataTransfer object to set the input's files property
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
            // Manually trigger the handleFileSelect logic with the dropped file
            handleFileSelect({ target: { files: dataTransfer.files } } as ChangeEvent<HTMLInputElement>);
        }
    };

    /**
     * Handles the drag over event to allow dropping.
     */
    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault(); // Necessary to allow dropping
        event.stopPropagation();
    };

    return (
        <div className={className}>
            <div
                className={`image-upload ${error ? 'error' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                />

                {preview ? (
                    <div className="image-preview">
                        <img
                            src={preview}
                            alt="Preview"
                        />
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div className="mt-2 text-center">
                            <span className="text-indigo-600 font-medium">Take a Photo</span>
                            <p className="text-sm text-gray-500 mt-1">Tap to open camera</p>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}