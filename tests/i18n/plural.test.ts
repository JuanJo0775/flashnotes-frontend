import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { translatePlural, pickPlural, setLang, useT } from '@/i18n';
import { renderHook } from '@testing-library/react';
import type { LocalizedPlural } from '@/i18n';

describe('plurales del diccionario', () => {
    test('el singular no dice "1 archivos"', () => {
        // El bug que motiva todo esto: el contador imprimía el número crudo
        // seguido de la forma plural fija.
        expect(translatePlural('es', 'sidebar.files', 1)).toBe('archivo');
        expect(translatePlural('en', 'sidebar.files', 1)).toBe('file');
    });

    test('el plural sigue siendo plural', () => {
        expect(translatePlural('es', 'sidebar.files', 0)).toBe('archivos');
        expect(translatePlural('es', 'sidebar.files', 2)).toBe('archivos');
        expect(translatePlural('es', 'sidebar.files', 47)).toBe('archivos');

        expect(translatePlural('en', 'sidebar.files', 0)).toBe('files');
        expect(translatePlural('en', 'sidebar.files', 2)).toBe('files');
    });

    test('la categoría la decide Intl, no un `n === 1` escrito a mano', () => {
        // Español e inglés coinciden en "uno contra el resto", pero eso es una
        // particularidad suya y no una ley. Delegar en Intl es lo que deja
        // entrar un idioma con más categorías sin tocar esta función.
        expect(new Intl.PluralRules('es').select(1)).toBe('one');
        expect(new Intl.PluralRules('es').select(2)).toBe('other');
    });
});

describe('pickPlural · para el texto de autor', () => {
    const ESCRITO: LocalizedPlural = {
        es: { one: '{n} archivo de {b}b', other: '{n} archivos de {b}b' },
        en: { one: '{n} file of {b}b', other: '{n} files of {b}b' },
    };

    test('elige la forma y sustituye las variables', () => {
        expect(pickPlural('es', ESCRITO, 1, { b: 80 })).toBe('1 archivo de 80b');
        expect(pickPlural('es', ESCRITO, 3, { b: 80 })).toBe('3 archivos de 80b');
        expect(pickPlural('en', ESCRITO, 1, { b: 80 })).toBe('1 file of 80b');
    });

    test('sin la forma que pide la regla, cae en `other`', () => {
        // `other` es obligatoria por tipo; `one` es opcional. Un idioma que sólo
        // declare `other` —el japonés -- tiene que seguir funcionando.
        const soloOther: LocalizedPlural = {
            es: { other: '{n} cosas' },
            en: { other: '{n} things' },
        };

        expect(pickPlural('es', soloOther, 1)).toBe('1 cosas');
    });
});

describe('t.plural en componentes', () => {
    beforeEach(() => {
        localStorage.clear();
        setLang('es');
    });

    test('el traductor del hook lleva los plurales colgados', () => {
        const { result } = renderHook(() => useT());

        expect(result.current.plural('sidebar.files', 1)).toBe('archivo');
        expect(result.current.plural('sidebar.files', 5)).toBe('archivos');
        // Y sigue siendo el traductor normal.
        expect(result.current('nav.notes')).toBe('Notas');
    });
});

/**
 * La garantía de que el sistema escala a un tercer idioma.
 *
 * Un `Record<Lang, string>` incompleto NO COMPILA cuando `Lang` gana un idioma;
 * un ternario `lang === 'es' ? … : …` compila igual y sirve inglés en silencio.
 * Este test prohíbe el ternario para que la garantía no se pueda perder por
 * descuido — que es exactamente como se había perdido en 27 sitios.
 */
describe('nadie elige idioma con un ternario', () => {
    const RAIZ = join(__dirname, '..', '..', 'src');

    /** Los .ts/.tsx de src, menos el propio motor de i18n. */
    function fuentes(dir: string): string[] {
        return readdirSync(dir).flatMap((nombre) => {
            const ruta = join(dir, nombre);
            if (statSync(ruta).isDirectory()) return fuentes(ruta);
            return /\.tsx?$/.test(ruta) ? [ruta] : [];
        });
    }

    /** Quita comentarios: hablar del patrón no es usarlo. */
    function soloCodigo(texto: string): string {
        return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    }

    const DETECTOR = /(lang|getLang\(\))\s*===\s*'es'\s*\?/;

    test('el detector caza de verdad el patrón que prohíbe', () => {
        // Un test de "no hay nada" que pasa porque el detector no funciona es
        // peor que no tenerlo: da confianza sin dar garantía.
        expect(DETECTOR.test("const x = lang === 'es' ? 'a' : 'b';")).toBe(true);
        expect(DETECTOR.test("const x = getLang() === 'es' ? 'a' : 'b';")).toBe(true);

        // Y no confunde lo legítimo: comparar sin ramificar texto.
        expect(DETECTOR.test("if (lang === 'es') registrarAlgo();")).toBe(false);
        expect(DETECTOR.test('const x = T.saludo[lang];')).toBe(false);
    });

    test('los comentarios que mencionan el patrón no cuentan', () => {
        expect(DETECTOR.test(soloCodigo("// no uses lang === 'es' ? a : b"))).toBe(false);
        expect(DETECTOR.test(soloCodigo("/* lang === 'es' ? a : b */"))).toBe(false);
    });

    test('no queda ningún `lang === \'es\' ? … : …` en src/', () => {
        const culpables = fuentes(RAIZ)
            // El motor sí compara idiomas: es su trabajo (toggleLang).
            .filter((ruta) => !ruta.includes(join('src', 'i18n')))
            .filter((ruta) =>
                DETECTOR.test(soloCodigo(readFileSync(ruta, 'utf8')))
            )
            .map((ruta) => ruta.slice(RAIZ.length + 1));

        expect(culpables).toEqual([]);
    });
});
