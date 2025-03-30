import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Location } from '../types/item';
import 'leaflet/dist/leaflet.css';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import MyLocationIcon from '@mui/icons-material/MyLocation'; // Geolocation Icon

// Fix for marker icons (remains the same)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41],
    iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    location?: Location | null;
    onLocationSelect?: (location: Location | null) => void;
    readOnly?: boolean;
    className?: string; // Keep for potential parent styling if needed
}

const DEFAULT_CENTER: L.LatLngTuple = [40.7128, -74.0060];
const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 18;
const GEOLOCATION_TIMEOUT = 10000;

export default function Map({
    location,
    onLocationSelect,
    readOnly = false,
    className = '' // Keep className prop
}: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Map initialization effect (logic remains the same)
    useEffect(() => {
        if (!mapRef.current && mapContainerRef.current) {
            const initialView: L.LatLngTuple = location ? [location.latitude, location.longitude] : DEFAULT_CENTER;
            const initialZoom = location ? SELECTED_ZOOM : DEFAULT_ZOOM;
            mapRef.current = L.map(mapContainerRef.current).setView(initialView, initialZoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);

            if (!readOnly && onLocationSelect) {
                mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
                    onLocationSelect({ latitude: e.latlng.lat, longitude: e.latlng.lng });
                });
            }
        }
        // Marker update logic (remains the same)
        if (mapRef.current) {
            if (location) {
                const latLng: L.LatLngTuple = [location.latitude, location.longitude];
                if (markerRef.current) {
                    markerRef.current.setLatLng(latLng);
                } else {
                    markerRef.current = L.marker(latLng).addTo(mapRef.current);
                }
                mapRef.current.setView(latLng, SELECTED_ZOOM);
            } else {
                if (markerRef.current) {
                    markerRef.current.remove();
                    markerRef.current = null;
                }
            }
        }
    }, [location, readOnly, onLocationSelect]);

    // Cleanup effect (remains the same)
    useEffect(() => {
        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    }, []);

    // Geolocation handler (logic remains the same)
    const handleGetCurrentLocation = useCallback(() => {
        setIsGettingLocation(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setIsGettingLocation(false); return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onLocationSelect?.({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                setIsGettingLocation(false);
            },
            (error) => {
                let errorMessage = 'Failed to get your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information is unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                setLocationError(errorMessage);
                setIsGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT }
        );
    }, [onLocationSelect]); // Added dependency

    // --- MUI Render Logic ---
    return (
        <Stack spacing={1} className={className}> {/* Use Stack for spacing */}
            {/* Geolocation Button and Error Display */}
            {!readOnly && (
                <Box>
                    <Button
                        variant="outlined" // Secondary style
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        startIcon={isGettingLocation ? <CircularProgress size={20} /> : <MyLocationIcon />}
                        size="small" // Make button smaller
                    >
                        {isGettingLocation ? 'Getting Location...' : 'Use Current Location'}
                    </Button>
                    {locationError && (
                        <Alert severity="warning" sx={{ mt: 1 }} variant="outlined"> {/* Use Alert for errors */}
                            {locationError}
                        </Alert>
                    )}
                </Box>
            )}

            {/* Map Container Box */}
            <Box
                id="map"
                ref={mapContainerRef}
                sx={{
                    height: 250, // Set height via sx
                    width: '100%',
                    borderRadius: 1, // Use theme border radius
                    border: '1px solid', // Add border
                    borderColor: 'grey.300', // Use theme color
                    zIndex: 1 // Ensure map is interactive
                    // className prop can still be used by parent if needed for more complex layout
                }}
            />
        </Stack>
    );
}

// NOTE: Remember to remove custom CSS classes like .btn, .btn-secondary, .spinner-sm from index.css later