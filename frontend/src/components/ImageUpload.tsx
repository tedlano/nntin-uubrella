import React, { useState, useRef, ChangeEvent, useEffect, useCallback } from 'react';
import imageCompression from 'browser-image-compression';
// import EXIF from 'exif-js'; // Removed exif-js import
import exifr from 'exifr'; // Import exifr
import { Location } from '../types/item'; // Import Location type

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

interface ImageUploadProps {
    onImageSelect: (base64Image: string | null) => void;
    className?: string;
    resetTrigger?: number;
    onGpsDataFound?: (location: Location) => void;
}

// Removed the DMS to DD conversion function as exifr.gps() returns decimal degrees directly

export default function ImageUpload({
    onImageSelect,
    className = '',
    resetTrigger = 0,
    onGpsDataFound
}: ImageUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentPreviewRef = useRef<string | null>(null);

    // Effect for resetting the component state
    useEffect(() => {
        if (resetTrigger > 0) {
            setPreview(null);
            setError(null);
            setIsLoading(false);
            onImageSelect(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [resetTrigger, onImageSelect]);

    // Effect for cleaning up the object URL
    useEffect(() => {
        currentPreviewRef.current = preview;
        return () => {
            if (currentPreviewRef.current) {
                URL.revokeObjectURL(currentPreviewRef.current);
            }
        };
    }, [preview]);

    const handleFileSelect = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setError(null);
        setPreview(null);
        setIsLoading(false);
        onImageSelect(null);

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // --- Attempt to read GPS Data using exifr BEFORE compression ---
        console.log("Attempting to read GPS data using exifr..."); // Updated log
        if (onGpsDataFound) {
            try {
                const gpsData = await exifr.gps(file); // Use exifr.gps()
                console.log("exifr GPS Data:", gpsData); // Added log

                if (gpsData && typeof gpsData.latitude === 'number' && typeof gpsData.longitude === 'number') {
                    console.log("Valid GPS data found, calling onGpsDataFound..."); // Added log
                    onGpsDataFound({ latitude: gpsData.latitude, longitude: gpsData.longitude });
                } else {
                    console.log("No valid GPS data found by exifr."); // Added log
                }
            } catch (exifError) {
                console.error("Error reading GPS data with exifr:", exifError);
                // Don't block the rest of the process if EXIF fails
            }
        } else {
            console.log("onGpsDataFound prop not provided.");
        }
        // --- End GPS Data Reading ---


        try {
            setIsLoading(true);

            // --- Image Compression ---
            const options = {
                maxSizeMB: 4.9,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                initialQuality: 0.7
            };

            const compressedFile = await imageCompression(file, options);

            // --- Preview and Callback ---
            const previewUrl = URL.createObjectURL(compressedFile);
            setPreview(previewUrl);

            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                onImageSelect(base64String);
                setIsLoading(false);
            };
            reader.onerror = () => {
                setError('Error reading compressed file.');
                setIsLoading(false);
            };
            reader.readAsDataURL(compressedFile);

        } catch (err) {
            setError('Error processing or compressing image');
            setIsLoading(false);
        }
    };

    const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => { // Make async
        event.preventDefault();
        event.stopPropagation();
        setError(null);
        setIsLoading(false);

        const file = event.dataTransfer.files?.[0];
        if (file && fileInputRef.current) {
            // Simulate file selection for handleFileSelect
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;
            // Directly call handleFileSelect as it's now async
            await handleFileSelect({ target: fileInputRef.current } as ChangeEvent<HTMLInputElement>);
        }
    }, [handleFileSelect]); // handleFileSelect dependency

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };


    // --- MUI Render Logic ---
    return (
        <Box className={className}>
            <Box
                sx={{
                    position: 'relative',
                    border: `2px dashed ${error ? 'error.main' : 'grey.400'}`,
                    borderRadius: 2,
                    p: 3,
                    textAlign: 'center',
                    cursor: isLoading ? 'wait' : 'pointer',
                    bgcolor: 'background.paper',
                    transition: (theme) => theme.transitions.create('border-color'),
                    '&:hover': {
                        borderColor: isLoading ? undefined : 'primary.main',
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
                    hidden
                    accept="image/*"
                    onChange={handleFileSelect}
                    disabled={isLoading}
                />

                {isLoading && (
                    <Box sx={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        bgcolor: 'rgba(255, 255, 255, 0.7)',
                        zIndex: 10
                    }}>
                        <CircularProgress />
                    </Box>
                )}

                <Box sx={{ position: 'relative', zIndex: 0, visibility: isLoading ? 'hidden' : 'visible' }}>
                    {preview ? (
                        <Box
                            component="img"
                            src={preview}
                            alt="Preview"
                            sx={{
                                maxHeight: 192,
                                width: 'auto',
                                maxWidth: '100%',
                                mx: 'auto',
                                borderRadius: 1,
                                display: 'block'
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