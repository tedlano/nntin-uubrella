import React, { useState, useRef, ChangeEvent } from 'react';
import imageCompression from 'browser-image-compression';

interface ImageUploadProps {
    onImageSelect: (base64Image: string) => void;
    className?: string;
}

export default function ImageUpload({ onImageSelect, className = '' }: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
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
            console.log(`Original file size: ${file.size / 1024 / 1024} MB`);

            // Compression options
            const options = {
                maxSizeMB: 4.9, // Target slightly below 5MB
                maxWidthOrHeight: 1920, // Optional: Limit dimensions
                useWebWorker: true,
                initialQuality: 0.7 // Start with a reasonable quality
            };

            // Compress the image
            const compressedFile = await imageCompression(file, options);
            console.log(`Compressed file size: ${compressedFile.size / 1024 / 1024} MB`);

            // Create preview from compressed file
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            // Convert compressed file to base64
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onImageSelect(base64String);
            };
            reader.readAsDataURL(compressedFile);
        } catch (err) {
            setError('Error processing or compressing image');
            console.error('Error processing/compressing image:', err);
        }
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const file = event.dataTransfer.files?.[0];
        if (file && fileInputRef.current) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
            handleFileSelect({ target: { files: dataTransfer.files } } as ChangeEvent<HTMLInputElement>);
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
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