// jest.config.js - Configuración de pruebas unitarias para frontend
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>'],
    testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                jsx: 'react-jsx',
            },
        }],
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.tsx',
    ],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
