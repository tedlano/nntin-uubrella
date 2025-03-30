import React from 'react';
import { Link } from 'react-router-dom';
// Placeholder for close icon, replace with actual icon later (e.g., from heroicons)
const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

interface SideNavProps {
    isOpen: boolean;
    onClose: () => void;
}

const SideNav: React.FC<SideNavProps> = ({ isOpen, onClose }) => {
    return (
        <div
            className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            aria-hidden={!isOpen} // Accessibility: hide when closed
        >
            <div className="p-4 flex flex-col h-full">
                {/* Header with Title and Close Button */}
                <div className="flex justify-between items-center mb-6">
                    {/* <h2 className="text-2xl font-bold text-indigo-600">UUbrella</h2> */} {/* Removed UUbrella */}
                    {/* Placeholder for potential new logo/title */}
                    <span className="text-xl font-semibold">Menu</span> {/* Added generic title */}
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-indigo-600"
                        aria-label="Close navigation menu" // Accessibility label
                    >
                        <CloseIcon />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-grow">
                    <ul>
                        <li className="mb-2">
                            <Link
                                to="/"
                                onClick={onClose} // Close panel on link click
                                className="block px-3 py-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100"
                            >
                                Hide Item
                            </Link>
                        </li>
                        <li className="mb-2">
                            <Link
                                to="/community-map"
                                onClick={onClose} // Close panel on link click
                                className="block px-3 py-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-gray-100"
                            >
                                Community Map
                            </Link>
                        </li>
                        {/* Add more links here if needed */}
                    </ul>
                </nav>

                {/* Optional Footer */}
                {/* <div className="mt-auto"> ... </div> */}
            </div>
        </div>
    );
};

export default SideNav;