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
import { COMMAND_NAMES } from '@/lib/system/commands';
import { SECRET_IDS } from '@/hooks/useSystemState';
import { ART, ART_TOTAL } from '@/lib/system/asciiArt';
import { DUMP_COLS, DUMP_ROWS, PATTERN_LEN } from '@/lib/system/lockoutPuzzle';
import { LOCKOUT_AT } from '@/lib/system/collapseEscalation';
import { es } from '@/i18n/es';

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
        // Lo dice §21, con su constante al lado. Es el umbral que faltaba al
        // fusionar las dos páginas: cada una lo tenía en su mitad y ninguna en
        // la del cuerpo que sobrevivió.
        expect(DOC).toContain('**tercer** intento');
        expect(DOC).toContain('CHAT_WINDOW_MS');
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

    it('el índice de piezas nombra TODAS las secciones, sin sobrar ninguna', () => {
        // El índice se escribe a mano y el cuerpo crece: sin esto, una pieza
        // nueva se queda fuera del índice y deja de existir para quien lo lee.
        const secciones = [...DOC.matchAll(/^# (\d+) · (.+)$/gm)];
        expect(secciones.length).toBeGreaterThanOrEqual(24);

        const indice = DOC.slice(
            DOC.indexOf('## Índice de piezas'),
            DOC.indexOf('# 1 · ')
        );

        for (const [, numero, titulo] of secciones) {
            expect(indice).toContain(`| §${numero} |`);
            expect(indice).toContain(titulo);
        }
    });

    it('la tabla de anunciados y escondidos dice lo que dice el registro', () => {
        /*
         * Esta tabla se escribe a mano sobre algo que cambia, y ya se desfasó
         * una vez: seguía poniendo `//hi` entre los anunciados mucho después de
         * que se pidiera esconderlo. Una tabla vieja no se ve vieja — se lee
         * como si fuera cierta.
         */
        const seccion = DOC.slice(
            DOC.indexOf('| **Anunciados** |'),
            DOC.indexOf('### Las fugas')
        );

        const anunciados = seccion.slice(0, seccion.indexOf('**Escondidos**'));
        const escondidos = seccion.slice(seccion.indexOf('**Escondidos**'));

        for (const nombre of COMMAND_NAMES) {
            expect(anunciados).toContain(`\`${nombre}\``);
        }

        // `//hi` es el caso que falló: escondido en el código, anunciado acá.
        expect(escondidos).toContain('`//hi`');
        expect(anunciados).not.toContain('`//hi`');
    });

    /*
     * LAS TRES TABLAS QUE ENUMERAN ALGO.
     *
     * Las tres se escriben a mano sobre listas que crecen, y las tres se
     * desfasaron: la de piezas decía que la polilla se ganaba estando quieto
     * (hoy la gana el colapso) y que había dos marcadores de pong con pieza
     * propia; la de secretos ni existía, y el ejemplo del panel decía `3/14`
     * cuando el registro ya iba por veintiocho.
     *
     * Enumerar es justo lo que un test puede vigilar sin opinar de nada.
     */
    it('⚠ el total de secretos que dice el texto es el de verdad', () => {
        /*
         * ⚠ ESTE TEST EXISTE POR UNA DERIVA QUE NADIE VIO. Los secretos pasaron
         * de veintiocho a treinta y tres, el encabezado de la lista se
         * actualizó — y siete menciones sueltas por el resto del documento se
         * quedaron en 28: la muestra del panel, el índice, dos enlaces, la nota
         * del `//reset` y la de la clave de almacenamiento.
         *
         * La tabla de identificadores ya estaba atada, así que el fallo pasó
         * por debajo: lo que no estaba atado eran los NÚMEROS escritos en la
         * prosa. Cualquier `n/NN` que hable del contador tiene que usar el
         * total real.
         */
        const total = SECRET_IDS.length;
        const contadores = [...DOC.matchAll(/`?\d+\/(\d+)`?\s*·\s*(?:DE PASO|SE FIJA|CURIOSO|INSISTE|CONOCE|NO QUEDA)/g)];

        expect(contadores.length).toBeGreaterThan(0);

        for (const [, denominador] of contadores) {
            expect(Number(denominador)).toBe(total);
        }

        // Y ninguna mención al conjunto puede citar otro número.
        expect(DOC).toContain(`Los ${total} secretos`);
        expect(DOC).not.toMatch(/lista de los (?!33\b)\d+\*\*/);
    });

    it('⚠ la muestra del panel usa las etiquetas que la app pinta de verdad', () => {
        /*
         * ⚠ LA FILA NO SE LLAMA «SECRETOS»: SE LLAMA `MMMM?`. Es deliberado
         * —la máquina no sabe cómo llamar a eso, y ponerle nombre sería la app
         * hablándole al jugador por encima del panel— y este documento la pintó
         * como `SECRETOS` durante mucho tiempo. Quien viniera a leerlo se
         * encontraba un panel distinto del que describe.
         */
        const panel = DOC.slice(
            DOC.indexOf('⚙ Diagnóstico del sistema'),
            DOC.indexOf('[EFECTOS: ON]')
        );

        expect(panel.length).toBeGreaterThan(0);
        expect(panel).toContain(es['diag.secrets']);
        expect(panel).toContain(es['diag.pieces']);
        expect(panel).toContain(es['diag.piecesNote']);
    });

    it('⚠ los enlaces internos del documento apuntan a algo que existe', () => {
        /*
         * El ancla `#los-28-secretos-que-cuenta-el-panel` sobrevivió a que su
         * encabezado pasara a decir 33: dos enlaces del documento llevaban a
         * ninguna parte y nadie se enteraba. Un índice que no lleva a su
         * sección es peor que no tenerlo.
         */
        /*
         * ⚠ CADA ESPACIO ES UN GUION, no cada RACHA de espacios. Los títulos
         * llevan un `·` en medio (`# 1 · Glitch ambiental`) y al quitar la
         * puntuación quedan DOS espacios seguidos: el ancla de verdad es
         * `1--glitch-ambiental`, con dos guiones. Colapsándolos, este test daba
         * por rotos diecisiete enlaces que estaban perfectos.
         */
        const ancla = (titulo: string) =>
            titulo
                .toLowerCase()
                .replace(/[^\p{L}\p{N} -]/gu, '')
                .trim()
                .replace(/ /g, '-');

        const anclas = new Set(
            [...DOC.matchAll(/^#{1,4} (.+)$/gm)].map(([, t]) => ancla(t))
        );

        const enlaces = [...DOC.matchAll(/\]\(#([\w-]+)\)/g)].map((m) => m[1]);

        expect(enlaces.length).toBeGreaterThan(0);

        const rotos = enlaces.filter((a) => !anclas.has(decodeURIComponent(a)));

        expect(rotos).toEqual([]);
    });

    it('la tabla de secretos nombra todos los que cuenta el panel', () => {
        /*
         * ⚠ EL ANCLA NO LLEVA EL NÚMERO, y antes sí lo llevaba.
         *
         * Estaba escrito `'# Los 28 secretos'`, así que el secreto veintinueve
         * dejaba el corte vacío y el test fallaba diciendo que faltaba
         * `commands` — el primero de la lista, que sí estaba. Un test que se
         * desfasa con la lista que vigila es exactamente lo que este bloque
         * existe para impedir, y caía en ello él mismo.
         *
         * La cuenta se sigue comprobando, pero abajo y contra la longitud real.
         */
        const inicio = DOC.search(/^# Los \d+ secretos/m);
        expect(inicio).toBeGreaterThanOrEqual(0);

        const seccion = DOC.slice(inicio);
        expect(seccion.length).toBeGreaterThan(0);

        expect(DOC).toContain(`SECRETOS n/${SECRET_IDS.length}`);

        for (const id of SECRET_IDS) {
            expect(seccion).toContain(`\`${id}\``);
        }

        // `//reset` es el único que NO cuenta, y el documento tiene que decir
        // por qué en vez de dejar el hueco sin explicar.
        expect(SECRET_IDS as readonly string[]).not.toContain('reset');
    });

    it('la tabla de piezas nombra las dieciséis y su camino', () => {
        const seccion = DOC.slice(
            DOC.indexOf('## Los dieciséis caminos'),
            DOC.indexOf('## `//keep`')
        );

        expect(seccion.length).toBeGreaterThan(0);
        expect(DOC).toContain(`/${ART_TOTAL}`);

        for (const pieza of ART) {
            // El `source` es lo que de verdad decide cómo se gana: es el campo
            // que cambió sin que la tabla se enterara.
            expect(seccion).toContain(`\`${pieza.source}\``);
        }
    });

    it('el puzzle del bloqueo dice su forma de verdad', () => {
        const seccion = DOC.slice(
            DOC.indexOf('## El puzzle · cómo se resuelve'),
            DOC.indexOf('# 14 · ')
        );

        expect(seccion.length).toBeGreaterThan(0);
        expect(seccion).toContain(`${DUMP_COLS} columnas por ${DUMP_ROWS} filas`);
        expect(seccion).toContain(`${DUMP_COLS * DUMP_ROWS} celdas`);
        expect(seccion).toContain(`patrón de siete bytes`);
        expect(PATTERN_LEN).toBe(7);

        // Y que sigan siendo primos entre sí: es TODA la dificultad del puzzle,
        // y la página lo explica apoyándose en eso.
        const mcd = (a: number, b: number): number => (b === 0 ? a : mcd(b, a % b));
        expect(mcd(PATTERN_LEN, DUMP_COLS)).toBe(1);

        expect(DOC).toContain(`**${LOCKOUT_AT}** colapsos seguidos`);
    });

    it('no queda ni una referencia al fichero que se fusionó', () => {
        // `EFECTOS.md` ya no existe: era la otra mitad de esta página, y tenerla
        // aparte hacía que los comandos salieran en las dos con listas que ya no
        // coincidían. Un enlace muerto invita a recrearlo.
        expect(DOC).not.toContain('EFECTOS.md');
    });
});
