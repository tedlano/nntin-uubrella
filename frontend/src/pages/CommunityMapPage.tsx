import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { getPublicItems } from '../utils/api';
import { PublicItemSummary } from '../types/item';
import 'leaflet/dist/leaflet.css';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper'; // Use Paper for map container elevation

// Fix for marker icons (remains the same)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function CommunityMapPage() {
    const [publicItems, setPublicItems] = useState<PublicItemSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const markersRef = useRef<L.LayerGroup | null>(null);

    // Map initialization effect (logic remains the same)
    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);
            markersRef.current = L.layerGroup().addTo(mapRef.current);
        }
        return () => {
            if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markersRef.current = null; }
        };
    }, []);

    // Fetch public items effect (logic remains the same)
    useEffect(() => {
        async function loadPublicItems() {
            setIsLoading(true); setError(null);
            try {
                const response = await getPublicItems();
                setPublicItems(response.items);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load public items');
                console.error("Error loading public items:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadPublicItems();
    }, []);

    // Update markers effect (logic remains the same, adjusted popup link)
    useEffect(() => {
        if (mapRef.current && markersRef.current) {
            const markerLayer = markersRef.current;
            markerLayer.clearLayers();
            if (publicItems.length > 0) {
                publicItems.forEach(item => {
                    const marker = L.marker([item.latitude, item.longitude]);
                    // Removed Tailwind classes from link
                    marker.bindPopup(`
                        <b>${item.title || 'Public Item'}</b><br>
                        ${item.category ? `Category: ${item.category}<br>` : ''}
                        <a href="/items/${item.item_id}" target="_blank" rel="noopener noreferrer">View Details</a>
                    `);
                    markerLayer.addLayer(marker);
                });
            }
        }
    }, [publicItems, mapRef.current]); // mapRef.current dependency is okay here

    // --- MUI Render Logic ---
    return (
        <Box sx={{ py: 3 }}> {/* Use Box with padding */}
            <Typography variant="h4" component="h1" align="center" gutterBottom>
                Community Map
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 3 }}>
                Discover publicly shared items and resources near you.
            </Typography>

            {isLoading && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 5 }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography color="text.secondary">Loading public items...</Typography>
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
            )}

            {/* Map Container */}
            <Paper elevation={3} sx={{ height: '60vh', overflow: 'hidden', borderRadius: 2 }}>
                {/* Attach ref to this inner Box */}
                <Box id="community-map" ref={mapContainerRef} sx={{ height: '100%', width: '100%' }}></Box>
            </Paper>
        </Box>
    );
}

// NOTE: Remember to remove custom CSS classes like .spinner, .map-container from index.css later