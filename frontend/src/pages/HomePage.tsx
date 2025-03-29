import React from 'react';
import ItemForm from '../components/ItemForm';

export default function HomePage() {
    return (
        <div className="container">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    UUbrella - Hidden Items
                </h1>
                <p className="text-lg text-gray-600">
                    Discretely share the location of found items with their owners
                </p>
            </div>

            <div className="card">
                <ItemForm />
            </div>
        </div>
    );
}