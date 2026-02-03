export interface BrowserIdentity {
    id: string;
    createdAt: string;
    lastActive: string;
}

export interface CachedNote {
    _id: string;
    title: string;
    content: string;
    localUpdatedAt: string;
    synced: boolean;
}
