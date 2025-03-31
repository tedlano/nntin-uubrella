import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import { createItem, searchLocation } from '../utils/api';
import { Location, CreateItemResponse, Visibility } from '../types/item';
import Map from './Map';
import ImageUpload from './ImageUpload';

// MUI Imports
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import Dialog from '@mui/material/Dialog'; // Added
import DialogTitle from '@mui/material/DialogTitle'; // Added
import DialogContent from '@mui/material/DialogContent'; // Added
import DialogContentText from '@mui/material/DialogContentText'; // Added
import DialogActions from '@mui/material/DialogActions'; // Added
import Link from '@mui/material/Link'; // Added

// MUI Icon Imports
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import InfoIcon from '@mui/icons-material/Info'; // Added for help icon
import CloseIcon from '@mui/icons-material/Close'; // Added for dialog close

// Define Item Types with Emojis
const ITEM_TYPES = [
    { value: 'private', label: 'Private Item', emoji: '🔒' },
    { value: 'public-umbrella', label: 'Community Umbrella', emoji: '☂️' },
    { value: 'public-library', label: 'Little Free Library', emoji: '📚' },
    { value: 'public-art', label: 'Public Art', emoji: '🎨' },
    { value: 'public-restroom', label: 'Public Restroom', emoji: '🚻' },
    { value: 'public-stray-cat', label: 'Cat', emoji: '🐈' },
    { value: 'public-water-fountain', label: 'Water Fountain', emoji: '💧' },
];

// Define categories for public items
const PUBLIC_CATEGORIES = [
    "Community Umbrella", "Little Free Library", "Public Art",
    "Public Restroom", "Cat", "Water Fountain",
    "Shared Tool", "Other Public Item"
];

// Helper function to get category from item type
const getCategoryFromType = (type: string): string => {
    const foundType = ITEM_TYPES.find(t => t.value === type);
    return foundType && type !== 'private' ? foundType.label : '';
};

// Helper function to get the *intended* title for submission based on item type
const getTitleFromType = (type: string): string => {
    const foundType = ITEM_TYPES.find(t => t.value === type);
    return foundType && type !== 'private' ? foundType.label : '';
}

// Default map center (e.g., a central location)
const DEFAULT_MAP_CENTER: Location = { latitude: 40.7128, longitude: -74.0060 }; // Example: NYC
const GEOLOCATION_TIMEOUT = 5000; // Reduced timeout for hint, main button uses 10s

// Define structure for location error state
interface LocationErrorState {
    message: string;
    code?: number; // GeolocationPositionError code (1: permission denied)
}

// Helper function to get current location with timeout
const getCurrentLocationPromise = (timeout: number): Promise<Location> => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            // Reject with a custom error structure if geolocation is not supported
            return reject({ message: 'Geolocation is not supported by your browser' });
        }
        const timer = setTimeout(() => reject({ message: 'Location request timed out', code: 3 }), timeout); // Code 3 for timeout
        navigator.geolocation.getCurrentPosition(
            (position) => {
                clearTimeout(timer);
                resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            },
            (error: GeolocationPositionError) => { // Explicitly type the error
                clearTimeout(timer);
                let errorMessage = 'Failed to get your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED: errorMessage = 'Location permission denied'; break;
                    case error.POSITION_UNAVAILABLE: errorMessage = 'Location information is unavailable'; break;
                    case error.TIMEOUT: errorMessage = 'Location request timed out'; break;
                }
                // Reject with the specific error code and message
                reject({ message: errorMessage, code: error.code });
            },
            { enableHighAccuracy: true, timeout: timeout } // Pass timeout here too
        );
    });
};


export default function ItemForm() {
    // State variables
    const [itemType, setItemType] = useState<string>(ITEM_TYPES[0].value);
    const [userEnteredTitle, setUserEnteredTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState<Location | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [category, setCategory] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<CreateItemResponse | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [imageResetTrigger, setImageResetTrigger] = useState(0);
    const [locationSetFromGps, setLocationSetFromGps] = useState(false);

    // Location Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [mapCenter, setMapCenter] = useState<Location | null>(null); // Start with null or default
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Geolocation State (moved from Map.tsx)
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    // Use the new error state structure
    const [locationError, setLocationError] = useState<LocationErrorState | null>(null);
    const [permissionHelpOpen, setPermissionHelpOpen] = useState(false); // State for help dialog


    // Effect to update category when itemType changes
    useEffect(() => {
        if (itemType === 'private') {
            setCategory('');
        } else {
            setCategory(getCategoryFromType(itemType));
        }
    }, [itemType]);


    const handleItemTypeChange = (event: SelectChangeEvent) => {
        setItemType(event.target.value as string);
    };

    // Update handleLocationSelect to reset the GPS flag and potentially map center
    const handleLocationSelect = useCallback((selectedLocation: Location | null) => {
        setLocation(selectedLocation);
        setLocationSetFromGps(false); // Reset flag on manual selection
        setLocationError(null); // Clear location error on manual selection
    }, []);

    // Update handleImageSelect to reset the GPS flag if image cleared
    const handleImageSelect = useCallback((selectedImage: string | null) => {
        setImage(selectedImage);
        if (!selectedImage) {
            setLocationSetFromGps(false);
        }
    }, []);

    // Update handleGpsDataFound to set the flag and map center
    const handleGpsDataFound = useCallback((gpsLocation: Location) => {
        console.log("GPS Data Found, setting location:", gpsLocation);
        setLocation(gpsLocation);
        setMapCenter(gpsLocation); // Center map on GPS location
        setLocationSetFromGps(true); // Set flag when GPS data is used
        setLocationError(null); // Clear location error if GPS from image works
    }, []);

    // --- Location Search Handler ---
    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        setIsSearchingLocation(true);
        setSearchError(null);
        setLocationError(null); // Clear geolocation error on new search

        let locationHint: Location | null = null;
        try {
            // Attempt to get current location quickly for biasing search
            console.log("Attempting to get location hint...");
            locationHint = await getCurrentLocationPromise(2000); // Short timeout (2s) for hint
            console.log("Location hint obtained:", locationHint);
        } catch (hintError: any) { // Catch specific error type if needed
            console.warn("Could not get location hint:", hintError?.message || hintError);
            // Proceed without hint if geolocation fails or times out quickly
        }

        try {
            // --- Call actual Geocoding API function with optional hint ---
            const result = await searchLocation(searchQuery.trim(), locationHint);

            if (result) {
                setMapCenter(result); // Update map center
                // Do NOT set the actual location marker here, let user click map
            } else {
                setSearchError('Location not found. Please try a different search.');
            }

        } catch (err) {
            console.error("Geocoding error:", err);
            setSearchError(err instanceof Error ? err.message : 'Failed to search for location.');
        } finally {
            setIsSearchingLocation(false);
        }
    };

    // Handle search on Enter key press
    const handleSearchKeyPress = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
            handleSearchLocation();
        }
    };
    // --- End Location Search ---

    // --- Geolocation Handler (moved from Map.tsx) ---
    const handleGetCurrentLocation = useCallback(async () => { // Make async
        setIsGettingLocation(true);
        setLocationError(null);
        setSearchError(null); // Clear search error
        try {
            // Use the promise helper with the standard timeout
            const currentLocation = await getCurrentLocationPromise(10000); // Use 10s timeout here
            setLocation(currentLocation); // Set the marker
            setMapCenter(currentLocation); // Center the map
            setLocationSetFromGps(false); // Not from photo GPS
        } catch (error: any) { // Catch specific error type if needed
            // Set the structured error state
            setLocationError({
                message: error?.message || 'Failed to get location',
                code: error?.code
            });
        } finally {
            setIsGettingLocation(false);
        }
    }, []); // Dependencies remain empty as it uses state setters


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        const isPrivateItem = itemType === 'private';
        const isPublicItem = !isPrivateItem;
        const titleToSubmit = isPrivateItem ? userEnteredTitle : getTitleFromType(itemType);
        const currentCategory = isPublicItem ? getCategoryFromType(itemType) : '';

        // Validation
        if (isPrivateItem && !userEnteredTitle.trim()) { setError('Title is required for private items'); return; }
        if (!description.trim()) { setError('Description is required'); return; }
        if (!image) { setError('Please upload an image'); return; }
        if (!location) { setError('Please select a location on the map'); return; }

        try {
            setIsSubmitting(true);
            const visibility: Visibility = isPublicItem ? 'PUBLIC' : 'PRIVATE';
            const payload = {
                title: titleToSubmit.trim(),
                description: description.trim(),
                latitude: location.latitude,
                longitude: location.longitude,
                image,
                visibility,
                ...(isPublicItem && { category: currentCategory })
            };
            const response = await createItem(payload);
            setSuccess(response);

            // Reset form including the GPS flag and search/geolocation
            setItemType(ITEM_TYPES[0].value);
            setUserEnteredTitle('');
            setDescription('');
            setLocation(null);
            setImage(null);
            setCategory('');
            setLocationSetFromGps(false); // Reset flag
            setImageResetTrigger(prev => prev + 1);
            setSearchQuery('');
            setMapCenter(null); // Reset map center
            setSearchError(null);
            setLocationError(null); // Reset location error


        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create item');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCopy = () => {
        if (success?.secret_url_path) {
            const url = `${window.location.origin}${success.secret_url_path}`;
            navigator.clipboard.writeText(url).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // Update handleHideAnother to reset the GPS flag and search/geolocation
    const handleHideAnother = () => {
        setSuccess(null);
        setCopied(false);
        setError(null);
        setItemType(ITEM_TYPES[0].value);
        setUserEnteredTitle('');
        setDescription('');
        setLocation(null);
        setImage(null);
        setCategory('');
        setLocationSetFromGps(false); // Reset flag
        setImageResetTrigger(prev => prev + 1);
        setSearchQuery('');
        setMapCenter(null); // Reset map center
        setSearchError(null);
        setLocationError(null); // Reset location error
    };

    // --- Dialog Handlers ---
    const handleOpenPermissionHelp = () => {
        setPermissionHelpOpen(true);
    };

    const handleClosePermissionHelp = () => {
        setPermissionHelpOpen(false);
    };

    // --- MUI Render Logic ---

    // Success View
    if (success) {
        const wasPrivate = !!success.secret_url_path;
        const url = wasPrivate ? `${window.location.origin}${success.secret_url_path}` : null;

        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
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

    // Form View
    return (
        <> {/* Use Fragment to allow Dialog sibling */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Stack spacing={3}>
                    {/* Item Type Dropdown */}
                    <FormControl fullWidth required>
                        <InputLabel id="item-type-label">Item Type</InputLabel>
                        <Select
                            labelId="item-type-label"
                            id="item-type"
                            value={itemType}
                            label="Item Type"
                            onChange={handleItemTypeChange}
                            renderValue={(selectedValue) => {
                                const selectedType = ITEM_TYPES.find(type => type.value === selectedValue);
                                return selectedType ? `${selectedType.emoji} ${selectedType.label}` : '';
                            }}
                        >
                            {ITEM_TYPES.map(type => (
                                <MenuItem key={type.value} value={type.value}>
                                    <Typography component="span" sx={{ mr: 1 }}>{type.emoji}</Typography> {type.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Conditional Title Input */}
                    {itemType === 'private' && (
                        <TextField
                            id="title"
                            label="Title"
                            value={userEnteredTitle}
                            onChange={(e) => setUserEnteredTitle(e.target.value)}
                            placeholder="What is the item?"
                            required={itemType === 'private'}
                            fullWidth
                            variant="outlined"
                        />
                    )}

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

                    {/* Image Upload */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom component="label">
                            Photo {image ? '(Selected)' : '(Required)'}
                        </Typography>
                        <ImageUpload
                            onImageSelect={handleImageSelect}
                            resetTrigger={imageResetTrigger}
                            onGpsDataFound={handleGpsDataFound}
                        />
                    </Box>

                    {/* Location Map Section */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom component="label">
                            Location {location ? '(Selected)' : '(Required)'}
                        </Typography>

                        {/* Combined Search and Geolocation Input Row */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <TextField
                                id="location-search"
                                label="Search Address or Place"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyPress={handleSearchKeyPress} // Handle Enter key
                                fullWidth // Takes remaining space
                                variant="outlined"
                                size="small" // Match IconButton size
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label="search location"
                                                onClick={handleSearchLocation}
                                                edge="end"
                                                disabled={isSearchingLocation || !searchQuery.trim()}
                                                size="small" // Match TextField size
                                            >
                                                {isSearchingLocation ? <CircularProgress size={20} /> : <SearchIcon />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <Tooltip title="Use Current Location">
                                <IconButton
                                    aria-label="use current location"
                                    onClick={handleGetCurrentLocation}
                                    disabled={isGettingLocation}
                                    color="primary" // Use theme color
                                >
                                    {isGettingLocation ? <CircularProgress size={24} color="inherit" /> : <MyLocationIcon />}
                                </IconButton>
                            </Tooltip>
                        </Box>

                        {/* Display Search or Geolocation Errors */}
                        {(searchError || locationError) && (
                            <Alert
                                severity="warning"
                                sx={{ mb: 1 }}
                                action={
                                    // Show info button only for permission denied error (code 1)
                                    locationError?.code === 1 ? (
                                        <Tooltip title="Why?">
                                            <IconButton
                                                aria-label="show location permission help"
                                                color="inherit"
                                                size="small"
                                                onClick={handleOpenPermissionHelp}
                                            >
                                                <InfoIcon fontSize="inherit" />
                                            </IconButton>
                                        </Tooltip>
                                    ) : null
                                }
                            >
                                {searchError || locationError?.message}
                            </Alert>
                        )}


                        {/* Conditional Alert for GPS Auto-Set */}
                        {locationSetFromGps && (
                            <Alert severity="info" icon={<InfoOutlinedIcon fontSize="inherit" />} sx={{ mb: 1 }}>
                                Location automatically set from photo GPS. Adjust on the map below if needed.
                            </Alert>
                        )}
                        {/* Updated Helper Text */}
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Search above, use the location button <MyLocationIcon fontSize="inherit" sx={{ verticalAlign: 'bottom' }} />, or click directly on the map to set the location.
                        </Typography>
                        <Map
                            location={location ?? undefined}
                            viewCenter={mapCenter ?? undefined} // Use the correct prop name: viewCenter
                            onLocationSelect={handleLocationSelect}
                        />
                    </Box>


                    {/* Error Display */}
                    {error && (
                        <Alert severity="error">{error}</Alert>
                    )}

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={isSubmitting || !image || !location || (itemType === 'private' && !userEnteredTitle.trim())}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isSubmitting ? 'Creating...' : (itemType === 'private' ? 'Hide Private Item' : `Create ${getTitleFromType(itemType)}`)}
                    </Button>
                </Stack>
            </Box>

            {/* Location Permission Help Dialog */}
            <Dialog
                open={permissionHelpOpen}
                onClose={handleClosePermissionHelp}
                aria-labelledby="location-permission-dialog-title"
                aria-describedby="location-permission-dialog-description"
            >
                <DialogTitle id="location-permission-dialog-title">
                    Location Permission Denied
                    <IconButton
                        aria-label="close"
                        onClick={handleClosePermissionHelp}
                        sx={{ position: 'absolute', right: 8, top: 8, color: (theme) => theme.palette.grey[500] }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="location-permission-dialog-description" component="div">
                        <Typography gutterBottom>
                            To use your current location, this website needs permission to access it. It looks like permission was denied. This might be because:
                        </Typography>
                        <ul>
                            <li>You previously denied permission for this site in your browser.</li>
                            {/* Replace > with &gt; */}
                            <li>Location services are turned off for your browser in your device's system settings (e.g., Settings &gt; Privacy &gt; Location Services on iOS/Android, or System Preferences/Settings on macOS/Windows).</li>
                            <li>Your browser doesn't support geolocation or has it disabled.</li>
                            <li>You are using a VPN or other software that might interfere with location detection.</li>
                        </ul>
                        <Typography gutterBottom>
                            Please check your browser and system settings to ensure location access is allowed for this website. You may need to reload the page after changing settings.
                        </Typography>
                        {/* Optional: Add links to generic browser help pages */}
                        {/* <Typography variant="body2">
                            <Link href="https://support.google.com/chrome/answer/142065" target="_blank" rel="noopener">Help for Chrome</Link> | {' '}
                            <Link href="https://support.mozilla.org/en-US/kb/does-firefox-share-my-location-websites" target="_blank" rel="noopener">Help for Firefox</Link> | {' '}
                            <Link href="https://support.apple.com/guide/safari/manage-location-services-ibrw7f78f7fe/mac" target="_blank" rel="noopener">Help for Safari</Link>
                        </Typography> */}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePermissionHelp}>OK</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}