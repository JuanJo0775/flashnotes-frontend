// jest.setup.ts
import '@testing-library/jest-dom';

// jsdom no implementa los métodos modales de <dialog>. ConfirmDialog usa
// showModal()/close(), así que se rellenan con una versión mínima que sí
// refleja el estado en la propiedad `open`, que es lo que consultan los tests.
if (typeof HTMLDialogElement !== 'undefined') {
    if (!HTMLDialogElement.prototype.showModal) {
        HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
            this.open = true;
        };
    }
    if (!HTMLDialogElement.prototype.close) {
        HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
            this.open = false;
            this.dispatchEvent(new Event('close'));
        };
    }
}

// jsdom no implementa matchMedia y varios componentes lo consultan (tema,
// prefers-reduced-motion). Por defecto responde "no coincide"; los tests que
// necesitan otra respuesta lo sobrescriben.
if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
        }),
    });
}

// NOTA: aquí se mockeaban global.addEventListener y removeEventListener con
// jest.fn(). Eso impedía que cualquier componente registrara listeners reales
// en los tests, y era parte de por qué la suite de NoteEditor fallaba.

// jsdom reporta `navigator.language = 'en-US'`, así que sin esto la app
// arrancaría en INGLÉS en las pruebas y toda aserción sobre un texto en español
// fallaría por el entorno y no por el código.
//
// Se fija en español —el idioma en el que está escrita la suite— para que el
// resultado no dependa del locale del entorno. Los tests que necesitan el otro
// idioma lo piden explícitamente con setLang() o con la clave de almacenamiento.
Object.defineProperty(window.navigator, 'language', {
    value: 'es-AR',
    configurable: true,
});
