import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ItemPage from './pages/ItemPage';
import NotFoundPage from './pages/NotFoundPage'; // Import the new component

function App() {
    return (
        <div className="app-container min-h-screen bg-gray-50 p-4"> {/* Optional: Add basic layout/padding */}
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/items/:id" element={<ItemPage />} />
                <Route path="*" element={<NotFoundPage />} /> {/* Catch-all route */}
            </Routes>
        </div>
    );
}

export default App;