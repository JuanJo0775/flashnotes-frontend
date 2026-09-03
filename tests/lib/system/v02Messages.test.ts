// tests/lib/system/v02Messages.test.ts

/**
 * LO QUE LA v0.2 DICE, Y QUE LA v1.0 NO DICE.
 *
 * Abrir una nota vacía en la v0.2 no encuentra «Escribe algo…». Encuentra la
 * nota que alguien se dejó a sí mismo mientras la escribía: «aca el usuario
 * empieza a escribir». Nadie la sustituyó nunca por el texto de verdad — y eso
 * es exactamente lo que se ve en una versión sin terminar.
 *
 * Y ALGUNOS DE ESOS MENSAJES SUELTAN UN COMANDO. Es el segundo sitio donde
 * asoman los exclusivos de la v0.2, junto con la basura de una nota que volvió
 * mal de la papelera. Ninguno está en `//help`: se encuentran leyendo.
 */

import {
    v02Placeholder,
    v02Notice,
    V02_NOTICE_KEYS,
    PLACEHOLDER_LEAK_ODDS,
} from '@/lib/system/v02Messages';
import { V02_SECRETS } from '@/lib/system/v02Restore';

const dado = (...v: number[]) => {
    let i = 0;
    return () => v[Math.min(i++, v.length - 1)];
};

describe('el marcador de la nota vacía', () => {
    it('es una nota del que la escribía, no un texto de producto', () => {
        const texto = v02Placeholder('es', dado(0.99));

        expect(texto.length).toBeGreaterThan(0);
        // Nada de mayúsculas de rótulo ni de puntuación cuidada: es un apunte.
        expect(texto).toBe(texto.toLowerCase());
    });

    it('de vez en cuando trae un comando, y es raro', () => {
        expect(PLACEHOLDER_LEAK_ODDS).toBeGreaterThan(0);
        expect(PLACEHOLDER_LEAK_ODDS).toBeLessThan(0.3);

        const conFuga = v02Placeholder('es', dado(0.01, 0));
        expect(V02_SECRETS.some((c) => conFuga.includes(c))).toBe(true);
    });

    it('sin fuga no menciona ningún comando: si saliera siempre sería un tutorial', () => {
        const limpio = v02Placeholder('es', dado(0.99));
        expect(limpio).not.toContain('//');
    });

    it('habla los dos idiomas', () => {
        expect(v02Placeholder('en', dado(0.99))).not.toBe(
            v02Placeholder('es', dado(0.99))
        );
    });
});

describe('los avisos propios de la v0.2', () => {
    it('tiene uno para cada situación que la v1.0 resuelve callando', () => {
        expect(V02_NOTICE_KEYS.length).toBeGreaterThanOrEqual(4);
    });

    it('cada uno dice algo en los dos idiomas', () => {
        for (const clave of V02_NOTICE_KEYS) {
            expect(v02Notice(clave, 'es').length).toBeGreaterThan(0);
            expect(v02Notice(clave, 'en').length).toBeGreaterThan(0);
        }
    });

    it('el mismo aviso dice siempre lo mismo', () => {
        // Un aviso que cambia en cada repintado se lee como una avería, no como
        // una versión vieja. Es la misma razón que las etiquetas rotas.
        const clave = V02_NOTICE_KEYS[0];
        expect(v02Notice(clave, 'es')).toBe(v02Notice(clave, 'es'));
    });
});
