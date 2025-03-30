import React from 'react'; // Removed useState
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ItemPage from './pages/ItemPage';
import NotFoundPage from './pages/NotFoundPage';
import CommunityMapPage from './pages/CommunityMapPage';
// Removed SideNav import
// Removed HamburgerIcon component

function App() {
    // Removed state and handlers for menu

    return (
        // Simplified outer container
        <div className="min-h-screen bg-gray-50 flex flex-col"> {/* Added flex flex-col */}
            {/* Logo Container */}
            <div className="container mx-auto py-4 px-4 bg-white shadow-sm"> {/* Aligned with main content */}
                <img src="/images/logo-inline.png" alt="Site Logo" className="h-auto w-full max-w-[7rem]" /> {/* Responsive width with max */}
            </div>

            {/* Page Content - Now directly inside the main container */}
            <main className="container mx-auto px-4 pt-3 pb-6"> {/* Reduced top padding */}
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/items/:id" element={<ItemPage />} />
                    <Route path="/community-map" element={<CommunityMapPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;