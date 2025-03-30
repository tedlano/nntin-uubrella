import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles'; // Import MUI theme components
import CssBaseline from '@mui/material/CssBaseline'; // Import CssBaseline
import App from './App';
import './index.css'; // Keep this for now, might remove custom styles later

// Create a default MUI theme instance
const theme = createTheme({
    // Add custom theme overrides here later if needed
    // palette: {
    //   primary: {
    //     main: '#yourColor',
    //   },
    // },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}> {/* Add MUI ThemeProvider */}
            <CssBaseline /> {/* Add baseline styles and normalization */}
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </ThemeProvider>
    </React.StrictMode>
);