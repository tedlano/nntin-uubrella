import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
    onImageSelect: (base64Image: string | null) => void; // Allow null for reset
    className?: string;
    resetTrigger?: number; // Prop to trigger reset from parent
}

/**
 * Component for handling image uploads via file input or drag-and-drop.
 * Features include:
 * - Image preview
 * - File type validation (image/*)
 * - Client-side image compression using 'browser-image-compression'.
 * - Conversion to Base64 format for the `onImageSelect` callback.
 * - Drag and drop support.
 * - Loading indicator during compression.
 * - Error display.
 * - Reset functionality via prop.
 */
export default function ImageUpload({
    onImageSelect,
    className = '',
    resetTrigger = 0 // Default value
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null); // State for the image preview URL
    const [error, setError] = useState<string | null>(null);     // State for displaying errors
    const [isLoading, setIsLoading] = useState(false);           // State for compression loading indicator
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPreviewRef = useRef<string | null>(null); // Ref to track current preview for cleanup

    // Effect for resetting the component state when resetTrigger changes
    useEffect(() => {
        if (resetTrigger > 0) { // Trigger on change (assuming parent increments it)
            setPreview(null);
            setError(null);
            setIsLoading(false);
            onImageSelect(null); // Notify parent that image is cleared
            // Clear the file input value
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [resetTrigger, onImageSelect]); // Include onImageSelect in dependencies

    // Effect for cleaning up the object URL
    useEffect(() => {
        // Store the current preview URL in the ref whenever it changes
        currentPreviewRef.current = preview;

        // Return a cleanup function
        return () => {
            // Revoke the *previous* object URL when the component unmounts or preview changes
            if (currentPreviewRef.current) {
                URL.revokeObjectURL(currentPreviewRef.current);
                console.log("Revoked Object URL:", currentPreviewRef.current); // For debugging
            }
        };
    }, [preview]); // Re-run when preview changes

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Reset states on new selection
        setError(null);
        setPreview(null); // Clear previous preview immediately
        setIsLoading(false); // Reset loading state
        onImageSelect(null); // Clear parent state

        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        try {
            setIsLoading(true); // Start loading indicator

            // --- Image Compression ---
            const options = {
                maxSizeMB: 4.9,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.7
            };

            console.log("Compressing image..."); // Debug log
            const compressedFile = await imageCompression(file, options);
            console.log("Compression complete."); // Debug log

            // --- Preview and Callback ---
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl); // Set new preview

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onImageSelect(base64String); // Pass Base64 to parent
                setIsLoading(false); // Stop loading indicator after success
            };
            reader.onerror = () => {
                setError('Error reading compressed file.');
                setIsLoading(false); // Stop loading on error
                console.error('FileReader error');
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            setError('Error processing or compressing image');
            setIsLoading(false); // Stop loading on error
            console.error('Error processing/compressing image:', err);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setError(null); // Clear error on drop
        setIsLoading(false); // Reset loading

        const file = event.dataTransfer.files?.[0];
        if (file && fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
            // Trigger the change event handler
            handleFileSelect({ target: fileInputRef.current } as ChangeEvent<HTMLInputElement>);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    return (
        <div className={className}>
            <div
                className={`image-upload relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 transition-colors ${error ? 'border-red-500' : ''} ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
                onClick={() => !isLoading && fileInputRef.current?.click()} // Prevent click when loading
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                aria-disabled={isLoading}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    disabled={isLoading} // Disable input while loading
                />

                {/* Loading Indicator Overlay */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                        <div className="spinner"></div> {/* Simple CSS spinner */}
                    </div>
                )}

                {/* Content Area */}
                <div className={`relative z-0 ${isLoading ? 'invisible' : ''}`}> {/* Hide content visually when loading */}
                    {preview ? (
                        <div className="image-preview">
                            <img
                                src={preview}
                                alt="Preview"
                                className="max-h-48 w-auto mx-auto rounded" // Constrain preview size
                            />
                        </div>
                    ) : (
                        <div className="upload-placeholder">
                            {/* Placeholder SVG and text */}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-12 h-12 text-gray-400 mx-auto">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div className="mt-2 text-center">
                                <span className="text-indigo-600 font-medium">Take or Upload Photo</span>
                                <p className="text-sm text-gray-500 mt-1">Tap or Drag & Drop</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {error && !isLoading && ( // Only show error if not loading
                <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
        </div>
    );
}