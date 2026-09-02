// tests/docs/secretos.test.ts

/**
 * QUE EL CATÁLOGO NO MIENTA.
 *
 * `docs/SECRETOS.md` lista las probabilidades exactas de cada efecto para poder
 * comprobarlos sin adivinar. Una documentación de números se desfasa en el
 * momento en que alguien ajusta una constante y no la escribe — y peor: sigue
 * pareciendo cierta, porque nada la contradice.
 *
 * Esto la ata al código. Si un porcentaje cambia y la página no, el test lo dice
 * en vez de dejar una cifra falsa con toda la pinta de estar verificada.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { LIE_ODDS, DROP_ODDS, TRASH_FAIL_ODDS } from '@/lib/system/v02';
import { CORRUPT_ODDS, LEAK_ODDS } from '@/lib/system/v02Restore';
import { PLACEHOLDER_LEAK_ODDS } from '@/lib/system/v02Messages';
import { GREETING_WINDOW_MS, KICK_AT, CHAT_GONE_AT } from '@/lib/system/greeting';

const DOC = readFileSync(join(process.cwd(), 'docs', 'SECRETOS.md'), 'utf8');

/** `0.22` -> `**22 %**`, tal y como se escribe en las tablas. */
const pct = (n: number) => `**${Math.round(n * 100)} %**`;

describe('docs/SECRETOS.md dice la verdad', () => {
    test.each([
        ['miente al guardar', LIE_ODDS],
        ['pierde de verdad', DROP_ODDS],
        ['la papelera no hace nada', TRASH_FAIL_ODDS],
        ['vuelve corrompida', CORRUPT_ODDS],
        ['asoma un comando', LEAK_ODDS],
        ['el marcador trae comando', PLACEHOLDER_LEAK_ODDS],
    ])('la probabilidad de «%s» está escrita', (_, odds) => {
        expect(DOC).toContain(pct(odds as number));
    });

    it('los umbrales de la escalada están escritos', () => {
        expect(DOC).toContain(`**${KICK_AT}**`);
        expect(DOC).toContain(`${GREETING_WINDOW_MS / 60_000} minutos`);
        expect(CHAT_GONE_AT).toBe(3);
        expect(DOC).toContain('**tercer** intento');
    });

    it('nombra las claves de almacenamiento que de verdad se usan', () => {
        for (const clave of [
            'flashnotes:v02',
            'flashnotes:v02word',
            'flashnotes:v02notes',
            'flashnotes:v02trash',
        ]) {
            expect(DOC).toContain(clave);
        }
    });

    it('recoge las cinco reglas que ningún efecto puede romper', () => {
        // Si alguien añade un efecto que pierde trabajo sin red, esta lista es
        // el sitio donde se ve que no debería.
        const seccion = DOC.slice(DOC.indexOf('# 8 · Lo que NUNCA pasa'));
        expect(seccion).toMatch(/^5\. /m);
        expect(seccion).not.toMatch(/^6\. /m);
    });
});
