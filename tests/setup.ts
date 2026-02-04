// tests/setup.ts - Configuración inicial para los tests
// Aquí puedes agregar setup global para todos los tests

// Mock de navigator.onLine si no está disponible en el entorno de test
Object.defineProperty(window, 'navigator', {
    value: {
        onLine: true,
    },
    writable: true,
});

// Mock de eventos del navegador
global.addEventListener = jest.fn();
global.removeEventListener = jest.fn();
