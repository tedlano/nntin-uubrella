import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Location } from '../types/item';
import 'leaflet/dist/leaflet.css';

// Fix for marker icons in bundled applications
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
    location?: Location | null; // Allow null to explicitly clear location/marker
    onLocationSelect?: (location: Location | null) => void; // Allow null for clearing
    readOnly?: boolean;
    className?: string;
}

const DEFAULT_CENTER: L.LatLngTuple = [40.7128, -74.0060]; // Default to NYC
const DEFAULT_ZOOM = 13;
const SELECTED_ZOOM = 18;
const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

export default function Map({
    location,
    onLocationSelect,
    readOnly = false,
    className = ''
}: MapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null); // Ref for the map container div
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    // Effect for map initialization and updates
    useEffect(() => {
        // Initialize map
        if (!mapRef.current && mapContainerRef.current) {
            const initialView: L.LatLngTuple = location ? [location.latitude, location.longitude] : DEFAULT_CENTER; // Explicitly type as LatLngTuple
            const initialZoom = location ? SELECTED_ZOOM : DEFAULT_ZOOM;

            mapRef.current = L.map(mapContainerRef.current).setView(initialView, initialZoom);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);

            // Add click handler only if interactive and callback exists
            if (!readOnly && onLocationSelect) {
                mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
                    const { lat, lng } = e.latlng;
                    // Call callback provided by parent
                    onLocationSelect({ latitude: lat, longitude: lng });
                    // No need to setView here, the effect will handle it when 'location' prop updates
                });
            }
        }

        // --- Update marker and view based on location prop ---
        if (mapRef.current) {
            if (location) {
                const { latitude, longitude } = location;
                const latLng: L.LatLngTuple = [latitude, longitude];

                // Update existing marker or create new one
                if (markerRef.current) {
                    markerRef.current.setLatLng(latLng);
                } else {
                    markerRef.current = L.marker(latLng).addTo(mapRef.current);
                }
                // Center map on the marker
                mapRef.current.setView(latLng, SELECTED_ZOOM);

            } else {
                // If location prop is null/undefined, remove the marker
                if (markerRef.current) {
                    markerRef.current.remove();
                    markerRef.current = null;
                }
                // Optionally reset view to default, or keep current view?
                // mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM); // Uncomment to reset view
            }
        }

        // ReadOnly is unlikely to change dynamically, but include if needed.
        // onLocationSelect should be memoized by parent (using useCallback) to prevent unnecessary runs.
    }, [location, readOnly, onLocationSelect]);


    // Effect for map cleanup on component unmount
    useEffect(() => {
        // Return cleanup function
        return () => {
            if (mapRef.current) {
                console.log("Removing map instance"); // Debug log
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []); // Empty dependency array ensures this runs only on unmount

    const handleGetCurrentLocation = () => {
        setIsGettingLocation(true);
        setLocationError(null);

        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser');
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Call callback provided by parent
                onLocationSelect?.({ latitude, longitude });
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
            // Options: enable high accuracy and set timeout
            { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT }
        );
    };

    return (
        <div className="space-y-2">
            {/* Geolocation Button and Error Display (only if interactive) */}
            {!readOnly && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            className="btn btn-secondary" // Use secondary style for less emphasis?
                        >
                            {isGettingLocation ? (
                                <>
                                    <span className="spinner-sm mr-2"></span> {/* Small spinner */}
                                    Getting Location...
                                </>
                            ) : (
                                'Use Current Location'
                            )}
                        </button>
                    </div>

                    {locationError && (
                        <p className="text-sm text-red-600">{locationError}</p>
                    )}
                </div>
            )}

            {/* Map Container Div */}
            <div
                id="map" // Keep ID if needed for CSS, but ref is primary for JS
                ref={mapContainerRef} // Assign ref here
                className={`leaflet-container ${className}`} // Ensure leaflet-container class is present
                style={{ height: '100%', minHeight: '250px' }} // Ensure container has height
            />
        </div>
    );
}