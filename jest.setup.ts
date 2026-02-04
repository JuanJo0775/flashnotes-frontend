// jest.setup.ts - Configuración y setup global de Jest
import '@testing-library/jest-dom';

// Mock de navigator.onLine si no está disponible
Object.defineProperty(global.navigator, 'onLine', {
    writable: true,
    value: true,
});

// Mock de eventos del navegador
global.addEventListener = jest.fn();
global.removeEventListener = jest.fn();

// Suprimir logs de console durante tests (opcional)
jest.spyOn(console, 'debug').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
