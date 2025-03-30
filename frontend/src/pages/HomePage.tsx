import React from 'react';
import ItemForm from '../components/ItemForm';

export default function HomePage() {
    return (
        <div className="container">
            <div className="text-center mb-4"> {/* Reduced bottom margin */}
                <p className="text-lg text-gray-600">
                    Discretely share the location of items
                </p>
            </div>

            <div className="card">
                <ItemForm />
            </div>
        </div>
    );
}