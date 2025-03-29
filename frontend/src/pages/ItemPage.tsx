import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getItem } from '../utils/api';
import { Item } from '../types/item';
import Map from '../components/Map';

export default function ItemPage() {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const secretKey = searchParams.get('key');

    const [item, setItem] = useState<Item | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadItem() {
            if (!id || !secretKey) {
                setError('Invalid URL');
                setIsLoading(false);
                return;
            }

            try {
                const itemData = await getItem(id, secretKey);
                setItem(itemData);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load item');
            } finally {
                setIsLoading(false);
            }
        }

        loadItem();
    }, [id, secretKey]);

    if (isLoading) {
        return (
            <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <div className="spinner"></div>
                    <p className="mt-4 text-gray-600">Loading item details...</p>
                </div>
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="container flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {error || 'Item not found'}
                    </h2>
                    <p className="text-gray-600 mb-6">
                        The item you're looking for might have been removed or the link is invalid.
                    </p>
                    <a
                        href="/"
                        className="btn btn-primary"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="card">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {item.title}
                </h1>

                <p className="text-gray-600 mb-6" style={{ whiteSpace: 'pre-wrap' }}>
                    {item.description}
                </p>

                <div className="image-preview mb-4">
                    <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-auto object-contain" // Added classes for responsive scaling
                    />
                </div>

                <div className="mb-6">
                    {/* Location heading removed */}
                    <Map
                        location={{
                            latitude: item.latitude,
                            longitude: item.longitude
                        }}
                        readOnly
                        className="w-full"
                    />
                </div>

                <div className="text-sm text-gray-500">
                    Hidden on {new Date(item.created_at).toLocaleDateString()}
                </div>
            </div>
        </div>
    );
}