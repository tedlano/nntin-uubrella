import React, { useState, FormEvent, useCallback } from 'react';
import { createItem } from '../utils/api';
import { Location, CreateItemResponse, Visibility } from '../types/item';
import Map from './Map'; // Assuming Map component remains for now
import ImageUpload from './ImageUpload'; // Assuming ImageUpload component remains for now

// MUI Imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack'; // For spacing form elements

// MUI Icon Imports
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


// Define categories for public items (keep as is)
const PUBLIC_CATEGORIES = [
    "Community Umbrella", "Shared Tool", "Street Art", "Public Restroom",
    "Water Fountain", "Little Free Library", "Other Public Item"
];

export default function ItemForm() {
    // State variables remain the same
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);
    const [category, setCategory] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<CreateItemResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageResetTrigger, setImageResetTrigger] = useState(0);

    // Callbacks remain the same
    const handleLocationSelect = useCallback((selectedLocation: Location | null) => {
        setLocation(selectedLocation);
    }, []);

    const handleImageSelect = useCallback((selectedImage: string | null) => {
        setImage(selectedImage);
    }, []);

    // handleSubmit logic remains largely the same, just uses state
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!title.trim()) { setError('Title is required'); return; }
        if (!description.trim()) { setError('Description is required'); return; }
        if (!location) { setError('Please select a location on the map'); return; }
        if (!image) { setError('Please upload an image'); return; }
        if (isPublic && !category) { setError('Please select a category for the public item'); return; }

        try {
            setIsSubmitting(true);
            const visibility: Visibility = isPublic ? 'PUBLIC' : 'PRIVATE';
            const payload = {
                title: title.trim(), description: description.trim(),
                latitude: location.latitude, longitude: location.longitude,
                image, visibility,
                ...(isPublic && { category: category })
            };
            const response = await createItem(payload);
            setSuccess(response);
            setTitle(''); setDescription(''); setLocation(null); setImage(null);
            setIsPublic(false); setCategory('');
            setImageResetTrigger(prev => prev + 1);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            setIsSubmitting(false);
        }
    };

    // handleCopy logic remains the same
    const handleCopy = () => {
        if (success?.secret_url_path) {
            const url = `${window.location.origin}${success.secret_url_path}`;
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // handleHideAnother logic remains the same
    const handleHideAnother = () => {
        setSuccess(null); setCopied(false); setError(null);
    };

    // --- MUI Render Logic ---

    // Success View (Refactored with MUI)
    if (success) {
        const wasPrivate = !!success.secret_url_path;
        const url = wasPrivate ? `${window.location.origin}${success.secret_url_path}` : null;

        return (
            // Card is handled by HomePage, just return the content
            <Box sx={{ p: 2, textAlign: 'center' }}> {/* Add padding */}
                <Typography variant="h5" component="h2" gutterBottom>
                    Item {wasPrivate ? 'Hidden' : 'Created'} Successfully!
                </Typography>
                {wasPrivate && url ? (
                    <>
                        <Typography color="text.secondary" sx={{ mb: 2 }}>
                            Share this secret URL with the item's owner (click to copy):
                        </Typography>
                        <Tooltip title={copied ? "Copied!" : "Click to copy URL"} placement="top">
                            <Box
                                onClick={handleCopy}
                                sx={{
                                    display: 'flex', alignItems: 'center', cursor: 'pointer',
                                    bgcolor: 'grey.100', p: 1.5, borderRadius: 1, mb: 2,
                                    wordBreak: 'break-all', position: 'relative',
                                    '&:hover': { bgcolor: 'grey.200' }
                                }}
                            >
                                <Typography variant="body2" sx={{ flexGrow: 1, mr: 4, textAlign: 'left' }}>{url}</Typography>
                                <IconButton size="small" sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)' }}>
                                    {copied ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                                </IconButton>
                            </Box>
                        </Tooltip>
                    </>
                ) : (
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        The public item has been created and will appear on the community map.
                    </Typography>
                )}
                <Button
                    onClick={handleHideAnother}
                    variant="contained"
                    fullWidth
                >
                    {wasPrivate ? 'Hide Another Item' : 'Create Another Item'}
                </Button>
            </Box>
        );
    }

    // Form View (Refactored with MUI)
    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={3}> {/* Use Stack for consistent spacing */}
                {/* Title Input */}
                <TextField
                    id="title"
                    label="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What is the item?"
                    required
                    fullWidth
                    variant="outlined"
                />

                {/* Description Input */}
                <TextField
                    id="description"
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the item and where exactly you hid/placed it..."
                    required
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                />

                {/* Location Map */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom component="label"> {/* Use Typography as label */}
                        Location {location ? '(Selected)' : '(Required)'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Click on the map or use the button to set the location.
                    </Typography>
                    {/* Assuming Map component takes className or style prop if needed */}
                    <Map location={location ?? undefined} onLocationSelect={handleLocationSelect} />
                    {/* Add sx={{ height: 250, width: '100%', borderRadius: 1 }} or similar if Map needs styling */}
                </Box>

                {/* Image Upload */}
                <Box>
                    <Typography variant="subtitle1" gutterBottom component="label">
                        Photo {image ? '(Selected)' : '(Required)'}
                    </Typography>
                    {/* Assuming ImageUpload component takes className or style prop if needed */}
                    <ImageUpload onImageSelect={handleImageSelect} resetTrigger={imageResetTrigger} />
                    {/* Add sx or className if ImageUpload needs styling */}
                </Box>

                {/* Visibility Options */}
                <Stack spacing={1}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => {
                                    setIsPublic(e.target.checked);
                                    if (!e.target.checked) { setCategory(''); }
                                }}
                            />
                        }
                        label="Make publicly visible on community map?"
                    />

                    {/* Conditional Category Dropdown */}
                    {isPublic && (
                        <FormControl fullWidth required={isPublic} size="small">
                            <InputLabel id="category-label">Category</InputLabel>
                            <Select
                                labelId="category-label"
                                id="category"
                                value={category}
                                label="Category"
                                onChange={(e: SelectChangeEvent) => setCategory(e.target.value)}
                            >
                                <MenuItem value="" disabled><em>-- Select a category --</em></MenuItem>
                                {PUBLIC_CATEGORIES.map(cat => (
                                    <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Stack>

                {/* Error Display */}
                {error && (
                    <Alert severity="error">{error}</Alert>
                )}

                {/* Submit Button */}
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={isSubmitting || !location || !image || (isPublic && !category)}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {isSubmitting ? 'Creating...' : (isPublic ? 'Create Public Item' : 'Hide Private Item')}
                </Button>
            </Stack>
        </Box>
    );
}