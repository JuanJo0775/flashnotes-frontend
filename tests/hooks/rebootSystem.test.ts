// tests/hooks/rebootSystem.test.ts

/**
 * APAGAR Y ENCENDER SE LLEVA LAS AVERIAS, Y NADA MAS.
 *
 * ⚠ SIN ESTO EL REINICIO ERA TEATRO. Se pidio jugando: «los errores tipo oscuro
 * y claro que se resuelven reiniciando, que se arreglen». Y con razon — el boton
 * y `//reboot` hacian el espectaculo entero —apagado, barras, rotulo,
 * comprobacion— y devolvian la maquina exactamente igual de rota. Una maquina
 * que se reinicia y sigue rota no se reinicio.
 *
 * ⚠ Y LA OTRA MITAD IMPORTA IGUAL: lo que NO se lleva. Los secretos, el arte y
 * las notas no son averias. Eso es `resetEverything`, que es otra cosa, avisa
 * antes, y es el unico comando destructivo de la app.
 */

import {
    getSystemState,
    markSecretFound,
    foundSecrets,
    rebootSystem,
    registerLogoClick,
    registerThemeToggle,
    resetEverything,
} from '@/hooks/useSystemState';

beforeEach(() => {
    localStorage.clear();
    resetEverything();
});

/** Rompe la señal como se rompe jugando: insistiendo con el tema. */
function romperLaSenal() {
    for (let i = 0; i < 12 && !getSystemState().chromaticFailure; i += 1) {
        registerThemeToggle();
    }
}

describe('lo que un reinicio SE LLEVA', () => {
    it('⚠ la averia del tema, que es la que se reporto', () => {
        romperLaSenal();
        expect(getSystemState().chromaticFailure).toBe(true);

        rebootSystem();

        expect(getSystemState().chromaticFailure).toBe(false);
    });

    it('y el desgaste del rotulo de la cabecera', () => {
        // Cinco golpes ya bajan la integridad: la maquina esta tocada.
        for (let i = 0; i < 5; i += 1) registerLogoClick();
        expect(getSystemState().integrity).toBeLessThan(100);

        rebootSystem();

        expect(getSystemState().integrity).toBe(100);
    });

    it('⚠ y deja el interruptor del tema OTRA VEZ utilizable', () => {
        /*
         * No basta con apagar la bandera: mientras la averia dura, el
         * interruptor «queda inservible hasta recargar» y deja de contar. Si el
         * contador sobreviviera, el siguiente toque volveria a romperlo en el
         * acto y el reinicio no habria servido de nada.
         */
        romperLaSenal();
        rebootSystem();

        // Un toque suelto despues del reinicio no puede romper nada.
        expect(registerThemeToggle()).toBe(false);
        expect(getSystemState().chromaticFailure).toBe(false);
    });
});

describe('⚠ lo que NO se lleva, que importa igual', () => {
    it('los secretos encontrados siguen encontrados', () => {
        /*
         * Reiniciar no es borrar. Si un reinicio se llevara lo ganado seria el
         * comando mas peligroso de la app disfrazado del mas inofensivo — y
         * encima esta a la vista, en un boton.
         */
        markSecretFound('commands');
        markSecretFound('diagnostics');
        const antes = [...foundSecrets()].sort();

        rebootSystem();

        expect([...foundSecrets()].sort()).toEqual(antes);
    });
});
