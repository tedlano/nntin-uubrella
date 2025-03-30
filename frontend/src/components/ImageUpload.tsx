import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'; // Example Icon

interface ImageUploadProps {
    onImageSelect: (base64Image: string | null) => void;
    className?: string; // Keep for potential parent styling, though MUI preferred
    resetTrigger?: number;
}

export default function ImageUpload({
    onImageSelect,
    className = '', // Keep className prop for now
    resetTrigger = 0
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPreviewRef = useRef<string | null>(null);

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
                // console.log("Revoked Object URL:", currentPreviewRef.current); // For debugging
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

            // console.log("Compressing image..."); // Debug log
            const compressedFile = await imageCompression(file, options);
            // console.log("Compression complete."); // Debug log

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
                // console.error('FileReader error');
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            setError('Error processing or compressing image');
            setIsLoading(false); // Stop loading on error
            // console.error('Error processing/compressing image:', err);
        }
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
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
    }, [handleFileSelect]); // Add handleFileSelect dependency

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };


    // --- MUI Render Logic ---
    return (
        <Box className={className}> {/* Outer Box */}
            <Box
                sx={{
                    position: 'relative',
                    border: `2px dashed ${error ? 'error.main' : 'grey.400'}`,
                    borderRadius: 2, // MUI theme spacing unit * 2
                    p: 3, // Padding using theme spacing
                    textAlign: 'center',
                    cursor: isLoading ? 'wait' : 'pointer',
                    bgcolor: 'background.paper', // Use theme background
                    transition: (theme) => theme.transitions.create('border-color'),
                    '&:hover': {
                        borderColor: isLoading ? undefined : 'primary.main', // Use theme primary color on hover
                    },
                    opacity: isLoading ? 0.7 : 1,
                }}
                onClick={() => !isLoading && fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                aria-disabled={isLoading}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden // Use hidden attribute
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                />

                {/* Loading Indicator Overlay */}
                {isLoading && (
                    <Box sx={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(255, 255, 255, 0.7)', // White overlay
                        zIndex: 10 // Ensure it's above content
                    }}>
                        <CircularProgress />
                    </Box>
                )}

                {/* Content Area */}
                <Box sx={{ position: 'relative', zIndex: 0, visibility: isLoading ? 'hidden' : 'visible' }}>
                    {preview ? (
                        <Box
                            component="img"
                            src={preview}
                            alt="Preview"
                            sx={{
                                maxHeight: 192, // approx 48 * 4 (theme spacing)
                                width: 'auto',
                                maxWidth: '100%', // Ensure it doesn't overflow container
                                mx: 'auto',
                                borderRadius: 1, // Match border radius
                                display: 'block' // Prevent extra space below img
                            }}
                        />
                    ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                            <Typography variant="body1" component="span" sx={{ color: 'primary.main', fontWeight: 'medium' }}>
                                Take or Upload Photo
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Tap or Drag & Drop
                            </Typography>
                        </Box>
                    )}
                </Box>
            </Box>

            {error && !isLoading && (
                <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}

// NOTE: Remember to remove custom CSS classes like .spinner, .image-upload etc. from index.css later