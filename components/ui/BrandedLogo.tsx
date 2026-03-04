import React, { useState, useEffect } from 'react';
import { ref, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '../../firebaseConfig';
import { logoUrl as defaultLogoUrl } from '../../assets';

interface BrandedLogoProps {
    logoUrl?: string;
    darkLogoUrl?: string;
    isDarkMode?: boolean;
    className?: string;
    alt?: string;
}

export const BrandedLogo: React.FC<BrandedLogoProps> = ({
    logoUrl,
    darkLogoUrl,
    isDarkMode = false,
    className = "h-8 w-auto",
    alt = "AgentGPS Logo"
}) => {
    const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const rawUrl = isDarkMode && darkLogoUrl ? darkLogoUrl : (logoUrl || defaultLogoUrl);

    useEffect(() => {
        const resolveUrl = async () => {
            if (!rawUrl) {
                setResolvedUrl(null);
                setLoading(false);
                return;
            }

            // Check if it's a Firebase Storage path (e.g., starts with 'gs://' or 'logos/')
            // We assume if it doesn't start with http/https/data, it might be a storage path
            const isStoragePath = !rawUrl.startsWith('http') && !rawUrl.startsWith('data:');

            if (isStoragePath) {
                try {
                    const storage = getStorageInstance();
                    if (storage) {
                        const storageRef = ref(storage, rawUrl);
                        const downloadUrl = await getDownloadURL(storageRef);
                        setResolvedUrl(downloadUrl);
                    } else {
                        setResolvedUrl(rawUrl); // Fallback to raw string if storage is not available
                    }
                } catch (error) {
                    console.error("Error resolving storage logo URL:", error);
                    setResolvedUrl(defaultLogoUrl); // Fallback to default on error
                }
            } else {
                setResolvedUrl(rawUrl);
            }
            setLoading(false);
        };

        resolveUrl();
    }, [rawUrl, isDarkMode]);

    if (loading) {
        return <div className={`${className} bg-border/20 animate-pulse rounded-md`} />;
    }

    if (!resolvedUrl) {
        return <span className="font-heading font-bold text-lg">AgentGPS</span>;
    }

    return (
        <img 
            src={resolvedUrl} 
            alt={alt} 
            className={className} 
            referrerPolicy="no-referrer"
            onError={(e) => {
                // If the resolved URL fails to load, fallback to default
                const target = e.target as HTMLImageElement;
                if (target.src !== defaultLogoUrl) {
                    target.src = defaultLogoUrl;
                }
            }}
        />
    );
};
