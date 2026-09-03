// tests/lib/system/v02Exit.test.ts

/**
 * LA SALIDA DE LA v0.2 SIGUE EXISTIENDO MAÑANA.
 *
 * Dentro de la v0.2 el reloj ya no enseña el morse — es la puerta de ENTRADA, no
 * algo de esa versión. Eso abre un agujero: el morse cambia por sesión, así que
 * al recargar la palabra de hoy es OTRA, la que sabías ya no vale, y no queda
 * dónde ver la nueva. Encerrado en una versión rota, con las notas de verdad
 * invisibles.
 *
 * Estos tests fijan lo contrario: la puerta por la que entraste es la puerta por
 * la que salís, aunque la sesión se haya reiniciado.
 */

import { enterV02, isV02, leaveV02, v02Word } from '@/lib/system/v02';

beforeEach(() => {
    leaveV02();
    localStorage.clear();
});

describe('la palabra con la que se entró', () => {
    it('se guarda al entrar, en mayúsculas', () => {
        enterV02('nido');
        expect(v02Word()).toBe('NIDO');
    });

    it('sobrevive a recargar: no vive sólo en memoria', () => {
        enterV02('madera');

        // Recargar es exactamente esto: lo que no esté en `localStorage` deja
        // de existir.
        expect(localStorage.getItem('flashnotes:v02word')).toBe('MADERA');
    });

    it('se olvida al salir, para que la próxima puerta sea otra', () => {
        enterV02('nido');
        leaveV02();

        expect(v02Word()).toBeNull();
        expect(isV02()).toBe(false);
    });

    it('nunca hay una v0.2 encendida sin palabra que la apague', () => {
        enterV02('cobre');

        // Ésta es LA invariante, y es lo que hace que el agujero no exista: la
        // bandera y la palabra viven en el MISMO sitio, y ese sitio es el que se
        // lee al recargar. Se guardan juntas y se pierden juntas, así que no
        // existe el estado «dentro, y sin salida».
        //
        // Se mira el almacenamiento y no `isV02()` a propósito: la función
        // recuerda el valor en memoria, y lo que decide qué encontrás mañana es
        // lo que quedó escrito, no lo que este módulo tenga cacheado hoy.
        expect(localStorage.getItem('flashnotes:v02')).not.toBeNull();
        expect(localStorage.getItem('flashnotes:v02word')).not.toBeNull();

        leaveV02();

        expect(localStorage.getItem('flashnotes:v02word')).toBeNull();
        expect(isV02()).toBe(false);
    });
});
