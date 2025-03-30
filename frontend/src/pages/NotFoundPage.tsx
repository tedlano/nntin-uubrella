import React from 'react';
import { Link as RouterLink } from 'react-router-dom'; // Import RouterLink

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

export default function NotFoundPage() {
    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                minHeight: '80vh' // Adjust height as needed
            }}
        >
            <Box>
                <Typography variant="h1" component="h1" sx={{ fontWeight: 'bold', mb: 2, fontSize: '6rem' }}> {/* Larger font size */}
                    404
                </Typography>
                <Typography variant="h4" component="h2" color="text.secondary" sx={{ mb: 3 }}>
                    Page Not Found
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 4 }}>
                    Sorry, the page you are looking for does not exist or has been moved.
                </Typography>
                <Button
                    component={RouterLink}
                    to="/"
                    variant="contained"
                >
                    Go Back Home
                </Button>
            </Box>
        </Box>
    );
}