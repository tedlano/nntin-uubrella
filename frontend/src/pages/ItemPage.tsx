import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link as RouterLink } from 'react-router-dom'; // Import RouterLink
import { getItem } from '../utils/api';
import { Item } from '../types/item';
import Map from '../components/Map'; // Assuming Map is refactored

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';

export default function ItemPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const secretKey = searchParams.get('key');
    const adminKey = searchParams.get('admin_key'); // Read admin_key

    const [item, setItem] = useState<Item | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Effect hook to fetch item data when the component mounts or id/secretKey/adminKey changes
    useEffect(() => {
        // Define the async function to perform the fetch
        async function loadItem() {
            // ID is still required
            if (!id) {
                setError('Invalid URL parameters. Missing ID.');
                setIsLoading(false);
                return; // Stop if ID is missing
            }

            // --- API Call ---
            // Key check removed, backend will handle authorization
            try {
                // Pass the appropriate key to the API call
                // We'll update the getItem function signature next
                const itemData = await getItem(id, secretKey, adminKey);
                setItem(itemData); // Store the fetched data in state
            } catch (err) {
                // --- Error Handling ---
                // --- Error Handling ---
                setError(err instanceof Error ? err.message : 'Failed to load item');
            } finally {
                // --- Cleanup ---
                setIsLoading(false); // Set loading to false regardless of success/error
            }
        }

        // Execute the loadItem function
        loadItem();
        // Dependency array: Re-run the effect if id or secretKey changes
    }, [id, secretKey]);


    // --- MUI Conditional Rendering ---

    // Loading State
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <Box sx={{ textAlign: 'center' }}>
                    <CircularProgress sx={{ mb: 2 }} />
                    <Typography color="text.secondary">Loading item details...</Typography>
                </Box>
            </Box>
        );
    }

    // Error State
    if (error || !item) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', textAlign: 'center' }}>
                <Box>
                    <Typography variant="h5" component="h2" gutterBottom color="error">
                        {error || 'Item not found'}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        The item you're looking for might have been removed or the link is invalid.
                    </Typography>
                    <Button
                        component={RouterLink} // Use RouterLink for navigation
                        to="/"
                        variant="contained"
                    >
                        Go Home
                    </Button>
                </Box>
            </Box>
        );
    }

    // --- Render Item Details (MUI) ---
    return (
        // Container is provided by App.tsx, just return the Card
        <Card>
            <CardContent>
                {/* Item Title */}
                <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 0.5 }}> {/* Reduced bottom margin */}
                    {item.title}
                </Typography>

                {/* Creation Date & Time (Moved) */}
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 2 }}> {/* Added bottom margin */}
                    Hidden on {new Date(item.created_at + 'Z').toLocaleString(undefined, { // Append 'Z' to ensure UTC parsing
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: 'numeric', minute: '2-digit' // Simplified options slightly
                    })}
                </Typography>

                {/* Item Description */}
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, whiteSpace: 'pre-wrap' }}>
                    {item.description}
                </Typography>

                {/* Item Image */}
                <CardMedia
                    component="img"
                    image={item.image_url}
                    alt={item.title}
                    sx={{
                        width: '100%',
                        maxHeight: 400, // Limit image height
                        objectFit: 'contain', // Ensure whole image is visible
                        borderRadius: 1, // Apply border radius
                        mb: 3 // Margin below image
                    }}
                />

                {/* Location Map */}
                <Box sx={{ mb: 3 }}>
                    <Map
                        location={{ latitude: item.latitude, longitude: item.longitude }}
                        readOnly
                    // Pass sx or className if Map component needs specific styling
                    // sx={{ height: 300 }} // Example
                    />
                </Box>

                {/* Redundant Creation Date removed */}
            </CardContent>
        </Card>
    );
}