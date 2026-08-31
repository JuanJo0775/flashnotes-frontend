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

// NOTA: aquí se mockeaban global.addEventListener y removeEventListener con
// jest.fn(). Eso impedía que cualquier componente registrara listeners reales
// en los tests, y era parte de por qué la suite de NoteEditor fallaba.
