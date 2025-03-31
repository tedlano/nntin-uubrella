import React, { useEffect, useRef, useCallback } from 'react'; // Removed useState
import L from 'leaflet';
import { Location } from '../types/item';
import 'leaflet/dist/leaflet.css';

// MUI Imports
import Box from '@mui/material/Box';
// Removed Button, Typography, CircularProgress, Alert
import Stack from '@mui/material/Stack';
// Removed MyLocationIcon

// Define custom icon (no shadow, slightly larger)
let CustomIcon = L.icon({
    iconUrl: '/images/favicon.png', // Path relative to public folder
    // shadowUrl: iconShadow, // Removed shadow
    iconSize: [36, 36], // Increased size slightly from [32, 32]
    iconAnchor: [18, 36], // Adjusted anchor to bottom center [width/2, height]
    popupAnchor: [0, -36], // Adjusted popup anchor relative to iconAnchor
    // shadowSize: [41, 41] // Removed shadow size
});

interface MapProps {
    location?: Location | null;
    onLocationSelect?: (location: Location | null) => void;
    readOnly?: boolean;
    viewCenter?: Location | null; // New prop to control map view center
    className?: string;
}

const DEFAULT_CENTER: L.LatLngTuple = [40.7128, -74.0060];
const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 18;
// Removed GEOLOCATION_TIMEOUT

export default function Map({
    location,
    onLocationSelect,
    readOnly = false,
    viewCenter, // Destructure the new prop here
    className = ''
}: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    // Removed isGettingLocation and locationError state

    // Map initialization effect
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
        // Marker update logic
        if (mapRef.current) {
            if (location) {
                const latLng: L.LatLngTuple = [location.latitude, location.longitude];
                if (markerRef.current) {
                    // If marker exists, update position and ensure icon is correct
                    markerRef.current.setLatLng(latLng);
                    if (markerRef.current.options.icon !== CustomIcon) {
                        markerRef.current.setIcon(CustomIcon);
                    }
                } else {
                    // Create marker explicitly with the custom icon
                    markerRef.current = L.marker(latLng, { icon: CustomIcon }).addTo(mapRef.current);
                }
                // Only set view based on marker if viewCenter isn't controlling it
                if (!viewCenter) {
                    mapRef.current.setView(latLng, SELECTED_ZOOM);
                }
            } else {
                if (markerRef.current) {
                    markerRef.current.remove();
                    markerRef.current = null;
                }
            }
        }
    }, [location, readOnly, onLocationSelect, viewCenter]); // Added viewCenter dependency

    // Effect to handle programmatic view changes via viewCenter prop
    useEffect(() => {
        if (mapRef.current && viewCenter) {
            const newCenter: L.LatLngTuple = [viewCenter.latitude, viewCenter.longitude];
            // Use setView for immediate change instead of flyTo animation
            // mapRef.current.flyTo(newCenter, SELECTED_ZOOM);
            mapRef.current.setView(newCenter, SELECTED_ZOOM);
        }
    }, [viewCenter]); // Re-run only when viewCenter changes

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
        };
    }, []);

    // Removed Geolocation handler (handleGetCurrentLocation)

    // --- MUI Render Logic ---
    return (
        <Stack spacing={1} className={className}>
            {/* Removed Geolocation Button and Error Display */}

            {/* Map Container Box */}
            <Box
                id="map"
                ref={mapContainerRef}
                sx={{
                    height: 250,
                    width: '100%',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    zIndex: 1
                }}
            />
        </Stack>
    );
}