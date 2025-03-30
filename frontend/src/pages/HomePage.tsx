import React from 'react';
import Box from '@mui/material/Box'; // Import Box
import Typography from '@mui/material/Typography'; // Import Typography
import Card from '@mui/material/Card'; // Import Card
import CardContent from '@mui/material/CardContent'; // Import CardContent for padding

import ItemForm from '../components/ItemForm'; // Assuming ItemForm will also be refactored

export default function HomePage() {
    return (
        <Box> {/* Replace outer div */}
            <Box sx={{ textAlign: 'center', mb: 4 }}> {/* Replace inner div and apply styles */}
                <Typography variant="h6" color="text.secondary"> {/* Replace p tag, adjust variant/color */}
                    Discretely share the location of items
                </Typography>
            </Box>

            <Card> {/* Replace card div */}
                <CardContent> {/* Add standard Card padding */}
                    <ItemForm />
                </CardContent>
            </Card>
        </Box>
    );
}