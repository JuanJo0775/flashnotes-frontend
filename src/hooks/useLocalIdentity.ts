'use client';

import { useEffect, useState } from 'react';
import { BrowserStorage } from '@/lib/storage/browserStorage';

export const useLocalIdentity = () => {
    const [browserId, setBrowserId] = useState<string>('');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const id = BrowserStorage.getBrowserId();
        setBrowserId(id);
        setIsReady(true);
    }, []);

    return { browserId, isReady };
};
