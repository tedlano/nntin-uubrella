import React, { useState } from 'react';
import { Routes, Route, Link as RouterLink } from 'react-router-dom'; // Import RouterLink
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
// Removed unused MUI Link import

import HomePage from './pages/HomePage';
import ItemPage from './pages/ItemPage';
import NotFoundPage from './pages/NotFoundPage';
import CommunityMapPage from './pages/CommunityMapPage';

function App() {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.50' }}>
            {/* Logo Bar using AppBar */}
            <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: 1 }}>
                <Container maxWidth="lg">
                    <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
                        {/* Logo wrapped in Link */}
                        <RouterLink to="/" style={{ textDecoration: 'none', display: 'inline-block' }}> {/* Wrap logo */}
                            <Box
                                component="img"
                                src="/images/logo-inline.png"
                                alt="Site Logo"
                                sx={{
                                    height: 'auto',
                                    maxWidth: { xs: '7rem', sm: '8rem', md: '10rem' },
                                    py: 1,
                                    display: 'block', // Ensure image behaves correctly within link
                                }}
                            />
                        </RouterLink>

                        {/* Hamburger Menu Icon */}
                        <IconButton
                            size="large"
                            edge="end"
                            color="inherit"
                            aria-label="menu"
                            aria-controls={open ? 'basic-menu' : undefined}
                            aria-haspopup="true"
                            aria-expanded={open ? 'true' : undefined}
                            onClick={handleMenuClick}
                            sx={{ color: 'text.primary' }}
                        >
                            <MenuIcon />
                        </IconButton>

                        {/* Menu Dropdown */}
                        <Menu
                            id="basic-menu"
                            anchorEl={anchorEl}
                            open={open}
                            onClose={handleMenuClose}
                            MenuListProps={{
                                'aria-labelledby': 'basic-button',
                            }}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                        >
                            <MenuItem onClick={handleMenuClose} component={RouterLink} to="/community-map">
                                Community Map
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </Container>
            </AppBar>

            {/* Page Content */}
            <Container component="main" maxWidth="lg" sx={{ flexGrow: 1, pt: 3, pb: 6 }}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/items/:id" element={<ItemPage />} />
                    <Route path="/community-map" element={<CommunityMapPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Container>
        </Box>
    );
}

export default App;