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
    location?: Location;
    onLocationSelect?: (location: Location) => void;
    readOnly?: boolean;
    className?: string;
}

export default function Map({
    location,
    onLocationSelect,
    readOnly = false,
    className = ''
}: MapProps) {
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string | null>(null);

    useEffect(() => {
        // Initialize map if it doesn't exist
        if (!mapRef.current) {
            mapRef.current = L.map('map').setView([40.7128, -74.0060], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);

            // Add click handler if not readonly
            if (!readOnly) {
                mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
                    const { lat, lng } = e.latlng;
                    onLocationSelect?.({ latitude: lat, longitude: lng });

                    // Zoom in closer when a pin is dropped
                    mapRef.current?.setView([lat, lng], 18);
                });
            }
        }

        // Update marker position when location changes
        if (location) {
            const { latitude, longitude } = location;

            // Remove existing marker
            if (markerRef.current) {
                markerRef.current.remove();
            }

            // Add new marker
            markerRef.current = L.marker([latitude, longitude])
                .addTo(mapRef.current);

            // Center map on marker with closer zoom
            mapRef.current.setView([latitude, longitude], 18);
        }

        // Cleanup function
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [location, onLocationSelect, readOnly]);

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
            { enableHighAccuracy: true }
        );
    };

    return (
        <div className="space-y-2">
            {!readOnly && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={handleGetCurrentLocation}
                            disabled={isGettingLocation}
                            className={`btn ${isGettingLocation ? 'btn-primary' : 'btn-primary'}`}
                        >
                            {isGettingLocation ? 'Getting Location...' : 'Log GPS Location'}
                        </button>
                    </div>

                    {locationError && (
                        <p className="text-sm text-red-600">{locationError}</p>
                    )}
                </div>
            )}

            <div
                id="map"
                className={`leaflet-container ${className}`}
            />
        </div>
    );
}