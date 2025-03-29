import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Simple component displayed when no other route matches (404 Not Found).
 */
export default function NotFoundPage() {
    return (
        <div className="container flex items-center justify-center text-center" style={{ minHeight: '80vh' }}>
            <div>
                <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-600 mb-6">Page Not Found</h2>
                <p className="text-gray-500 mb-8">
                    Sorry, the page you are looking for does not exist or has been moved.
                </p>
                <Link
                    to="/"
                    className="btn btn-primary"
                >
                    Go Back Home
                </Link>
            </div>
        </div>
    );
}