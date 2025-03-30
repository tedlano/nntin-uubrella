import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
// No longer importing Link as we use raw href in popup
import { getPublicItems } from '../utils/api';
import { PublicItemSummary } from '../types/item';
// Removed Map component import as we initialize Leaflet directly here
import 'leaflet/dist/leaflet.css';

// Fix for marker icons (ensure this is done globally or here)
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


// Optional: Define icons for different categories
// import iconUmbrella from '../assets/icons/umbrella.png'; // Example
// const categoryIcons = {
//     "Community Umbrella": L.icon({ iconUrl: iconUmbrella, iconSize: [32, 32] }),
//     // Add other category icons...
//     "Default": L.Marker.prototype.options.icon // Use default Leaflet icon
// };

/**
 * Page component for displaying publicly shared items on a map.
 */
export default function CommunityMapPage() {
    const [publicItems, setPublicItems] = useState<PublicItemSummary[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const mapRef = useRef<L.Map | null>(null); // Ref to hold the Leaflet map instance
    const mapContainerRef = useRef<HTMLDivElement>(null); // Ref for the map container div
    const markersRef = useRef<L.LayerGroup | null>(null); // Ref to hold marker layer group for easy clearing

    // Effect to initialize the map instance
    useEffect(() => {
        // Ensure container exists and map isn't already initialized
        if (mapContainerRef.current && !mapRef.current) {
            mapRef.current = L.map(mapContainerRef.current).setView([40.7128, -74.0060], 13); // Default view
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(mapRef.current);

            // Initialize marker layer group
            markersRef.current = L.layerGroup().addTo(mapRef.current);
        }

        // Cleanup function to remove map on component unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markersRef.current = null; // Clear marker group ref
            }
        };
    }, []); // Empty dependency array ensures this runs only once on mount/unmount

    // Effect to fetch public items
    useEffect(() => {
        async function loadPublicItems() {
            setIsLoading(true);
            setError(null);
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
    }, []); // Fetch only once on mount

    // Effect to update markers when publicItems change or map is ready
    useEffect(() => {
        // Ensure map and marker layer group exist
        if (mapRef.current && markersRef.current) {
            const markerLayer = markersRef.current;
            // Clear existing markers before adding new ones
            markerLayer.clearLayers();

            if (publicItems.length > 0) {
                console.log(`Adding ${publicItems.length} markers to the map.`);
                publicItems.forEach(item => {
                    // const icon = categoryIcons[item.category || "Default"] || categoryIcons["Default"]; // Get category icon or default
                    const marker = L.marker([item.latitude, item.longitude] /*, { icon }*/);

                    // Add popup with title, category, and link to item page
                    // Using raw href as Link component doesn't work directly in Leaflet popups
                    marker.bindPopup(`
                        <b>${item.title || 'Public Item'}</b><br>
                        ${item.category ? `Category: ${item.category}<br>` : ''}
                        <a href="/items/${item.item_id}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">View Details</a>
                    `);
                    markerLayer.addLayer(marker); // Add marker to the layer group
                });

                // Optional: Fit map bounds to markers
                // const bounds = L.latLngBounds(publicItems.map(item => [item.latitude, item.longitude]));
                // if (bounds.isValid()) {
                //    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                // }
            }
        }
    }, [publicItems, mapRef.current]); // Re-run when items load or map instance changes


    // --- Render Logic ---
    return (
        <div className="container py-6 space-y-4">
            <h1 className="text-3xl font-bold text-gray-900 text-center">Community Map</h1>
            <p className="text-lg text-gray-600 text-center">
                Discover publicly shared items and resources near you.
            </p>

            {isLoading && (
                <div className="text-center py-10">
                    <div className="spinner"></div>
                    <p className="mt-4 text-gray-600">Loading public items...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {/* Map Container Div */}
            <div className="map-container h-[60vh] rounded-lg overflow-hidden shadow-lg">
                {/* Attach ref to this div */}
                <div id="community-map" ref={mapContainerRef} style={{ height: '100%', width: '100%' }}></div>
            </div>
        </div>
    );
}