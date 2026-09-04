// tests/lib/system/entityAway.test.ts

/**
 * LO ÚNICO QUE NO SE PUEDE FINGIR: QUE VOLVISTE.
 *
 * El resto de lo que él sabe de vos sale de cosas que la app ya registra. Esto
 * no estaba en ningún lado y no hay forma de deducirlo: o se anota cuándo
 * estuviste, o no existe la nota del día siguiente.
 *
 * ⚠ Y ES LO MÍNIMO. No guarda cuántas veces viniste ni cuánto te quedaste: sólo
 * el último momento en que estuviste. Con eso alcanza para saber si volviste, y
 * cualquier cosa de más sería llevar la cuenta de alguien.
 */

import {
    AWAY_ENOUGH,
    awayAtBoot,
    awayMs,
    clearEntity,
    forgetBootAway,
    markSeen,
} from '@/lib/system/entity';

beforeEach(() => {
    localStorage.clear();
    clearEntity();
    forgetBootAway();
});

describe('la primera vez', () => {
    it('no hay ausencia que medir', () => {
        // Nunca estuviste, así que no volviste. Una nota de bienvenida al
        // primer arranque no sería «volviste», sería un tutorial — y él no le
        // da la bienvenida a nadie.
        expect(awayMs()).toBe(0);
    });
});

describe('cuando ya estuviste', () => {
    it('mide desde la última vez', () => {
        markSeen(1_000);

        expect(awayMs(1_000 + 5_000)).toBe(5_000);
    });

    it('y volver a marcar reinicia la cuenta', () => {
        markSeen(1_000);
        markSeen(9_000);

        expect(awayMs(10_000)).toBe(1_000);
    });

    it('un reloj que va para atrás no da ausencias negativas', () => {
        markSeen(9_000);

        expect(awayMs(1_000)).toBe(0);
    });
});

describe('cuánto es «te fuiste»', () => {
    it('unas horas, no unos minutos', () => {
        /*
         * ⚠ TIENE QUE SER LARGO. Si bastaran veinte minutos, la nota saldría
         * por irse a comer, y entonces no dice «volviste» — dice «te
         * distrajiste», que no tiene ninguna gracia.
         */
        expect(AWAY_ENOUGH).toBeGreaterThanOrEqual(6 * 60 * 60 * 1000);
    });
});

describe('cuando el almacenamiento falla', () => {
    it('una marca corrupta se ignora', () => {
        localStorage.setItem('flashnotes:seen', 'ayer por la tarde');

        expect(awayMs()).toBe(0);
    });
});

describe('⚠ LEER ANTES DE MARCAR, que es fácil de romper al revés', () => {
    /*
     * Si `markSeen()` corriera en un efecto de arranque y la papelera se leyera
     * un instante después, la ausencia ya valdría cero y la nota del día
     * siguiente no saldría NUNCA — sin dar ningún error.
     *
     * `awayAtBoot()` junta las dos cosas: el primero que pregunta fija el
     * número y marca la visita, y todos los demás ven el mismo.
     */

    it('mide la ausencia y deja anotado que estás acá', () => {
        markSeen(0);

        expect(awayAtBoot(AWAY_ENOUGH + 1)).toBe(AWAY_ENOUGH + 1);
        expect(awayMs(AWAY_ENOUGH + 1)).toBe(0);
    });

    it('y preguntarla otra vez da lo mismo, no cero', () => {
        markSeen(0);
        awayAtBoot(AWAY_ENOUGH + 1);

        expect(awayAtBoot(AWAY_ENOUGH + 99)).toBe(AWAY_ENOUGH + 1);
    });
});

describe('//reset se la lleva', () => {
    it('vuelve a ser la primera vez', () => {
        // Un borrado que deja puesto cuándo estuviste no es un borrado, y
        // encima le regalaría al ente la nota del día siguiente sin ausencia.
        markSeen(1_000);

        clearEntity();

        expect(awayMs(999_999)).toBe(0);
    });
});
