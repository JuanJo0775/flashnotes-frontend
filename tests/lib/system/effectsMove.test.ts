// tests/lib/system/effectsMove.test.ts

/**
 * CADA EFECTO CAMBIA ALGO DE VERDAD.
 *
 * ⚠ POR QUÉ ESTE TEST Y NO UNA COMPROBACIÓN EN EL NAVEGADOR.
 *
 * Se intentó tres veces medirlo abriendo los veinticinco en el visor y
 * muestreando estilos calculados, y las tres el renderizador se colgó: abrir
 * efectos a pantalla completa con `filter: url()` encadenados es demasiado caro
 * para hacerlo en serie. Y aunque no se colgara, sería una comprobación que sólo
 * corre si alguien se acuerda de correrla.
 *
 * Leer los fotogramas responde la misma pregunta, sin navegador y en cada
 * ejecución de la suite: una animación cuyos fotogramas dicen todos LO MISMO no
 * puede producir ningún cambio, por muy bien montada que esté. Corre a sesenta
 * cuadros por segundo y no se ve nada — que es exactamente el fallo que este
 * catálogo ya tuvo dos veces por otros motivos.
 *
 * Lo que NO prueba: que se vea BIEN. Eso lo dice un ojo, no un test.
 */

import { readFileSync } from 'node:fs';
import { VISUAL_EFFECTS } from '@/lib/system/effectsCatalog';

const HOJAS = [
    'src/styles/animations.css',
    'src/styles/glitch.css',
    'src/styles/v02.css',
] as const;

const CSS = HOJAS.map((f) => readFileSync(f, 'utf8')).join('\n');

/** Los bloques internos de un `@keyframes`, ya sin comentarios. */
function fotogramas(id: string): string[] {
    const limpio = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const patron = new RegExp(
        String.raw`@keyframes[ ]+` + id + String.raw`[ ]*\{([\s\S]*?)[\r\n]\}`
    );
    const cuerpo = patron.exec(limpio)?.[1];

    if (!cuerpo) return [];

    return [...cuerpo.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1]);
}

/** Qué valores toma cada propiedad a lo largo de la animación. */
function valoresPorPropiedad(id: string): Map<string, Set<string>> {
    const mapa = new Map<string, Set<string>>();

    for (const bloque of fotogramas(id)) {
        for (const decl of bloque.split(';')) {
            const corte = decl.indexOf(':');
            if (corte < 0) continue;

            const prop = decl.slice(0, corte).trim();
            const valor = decl.slice(corte + 1).trim();
            if (!prop) continue;

            if (!mapa.has(prop)) mapa.set(prop, new Set());
            mapa.get(prop)!.add(valor);
        }
    }

    return mapa;
}

describe('los veinticinco se mueven', () => {
    it.each(VISUAL_EFFECTS.map((e) => [e.id] as const))(
        '%s declara sus fotogramas',
        (id) => {
            // Un `@keyframes` vacío o mal cerrado deja una animación que el
            // navegador acepta y descarta en silencio.
            expect(fotogramas(id).length).toBeGreaterThan(1);
        }
    );

    it.each(VISUAL_EFFECTS.map((e) => [e.id] as const))(
        '%s cambia al menos una propiedad',
        (id) => {
            /*
             * ⚠ ÉSTA ES LA PREGUNTA QUE IMPORTA: ¿hay alguna propiedad que tome
             * DOS valores distintos? Si no la hay, la animación existe, corre y
             * no produce ni un píxel de diferencia.
             */
            const cambian = [...valoresPorPropiedad(id)]
                .filter(([, valores]) => valores.size > 1)
                .map(([prop]) => prop);

            expect(cambian.length).toBeGreaterThan(0);
        }
    );
});

describe('y ninguno se mueve de una forma que su sitio no permita', () => {
    it('lo que sólo cambia `backdrop-filter` va en una capa', () => {
        // Ya lo cubre el catálogo, pero acá se mira desde el otro lado: por lo
        // que la animación HACE, no por lo que la ficha dice.
        for (const e of VISUAL_EFFECTS) {
            const props = [...valoresPorPropiedad(e.id)]
                .filter(([, v]) => v.size > 1)
                .map(([p]) => p);

            if (props.length > 0 && props.every((p) => p === 'backdrop-filter')) {
                expect(e.donde).toBe('capa');
            }
        }
    });

    /*
     * ⚠ AQUÍ HABÍA UNA TERCERA COMPROBACIÓN Y SE QUITÓ. Vale la pena contar por
     * qué, para que nadie la reescriba.
     *
     * Intentaba deducir del CSS que «lo que sólo anima `transform` tiene que ir
     * sobre la pantalla». Falló dos veces seguidas contra casos legítimos: el
     * barrido es una línea que se pinta ella y baja; las barras del colapso
     * caen; la lluvia binaria se mueve y su contenido es TEXTO, que no aparece
     * en ninguna declaración de CSS. Los tres son capas correctas.
     *
     * La pregunta real —¿este elemento tiene algo propio que enseñar?— no se
     * puede contestar leyendo hojas de estilo, porque la respuesta a veces está
     * en el JSX. Y un test al que hay que añadirle una excepción cada vez que
     * dice la verdad ya no comprueba nada: sólo describe la lista que tenemos.
     *
     * Lo que sí queda son las dos reglas que NO admiten matices, y las dos
     * cazaron un fallo de verdad: `backdrop-filter` filtra lo de detrás, así que
     * va en una capa; `filter: url()` filtra el contenido propio, así que va
     * sobre la pantalla.
     */
});
