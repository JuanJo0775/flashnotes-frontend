// src/config/env.ts
const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key];

    if (!value && !defaultValue) {
        throw new Error(`Variable de entorno ${key} no está definida`);
    }

    return value || defaultValue!;
};

export const env = {
    // API Configuration
    API_URL: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:5000/api'),

    // Feature flags (opcional)
    ENABLE_HISTORY: getEnvVar('NEXT_PUBLIC_ENABLE_HISTORY', 'false') === 'true',
} as const;

export type Env = typeof env;