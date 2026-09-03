import { translate } from '@/i18n';
import { es } from '@/i18n/es';
import { en } from '@/i18n/en';

describe('translate', () => {
    test('devuelve el texto del idioma pedido', () => {
        expect(translate('es', 'nav.trash')).toBe('Papelera');
        expect(translate('en', 'nav.trash')).toBe('Trash');
    });

    test('interpola las variables', () => {
        expect(translate('es', 'list.loadMore', { n: 7 })).toBe('[↓] Cargar 7 más');
        expect(translate('en', 'list.loadMore', { n: 7 })).toBe('[↓] Load 7 more');
    });

    test('interpola varias variables distintas', () => {
        expect(translate('es', 'theme.status', { mode: 'oscuro', other: 'claro' })).toBe(
            'Tema oscuro. Pulsá para cambiar a claro.'
        );
    });

    test('una variable que falta deja el hueco a la vista', () => {
        // Se prefiere `{other}` visible a una cadena rota en silencio: un texto
        // incompleto tiene que notarse.
        expect(translate('es', 'theme.status', { mode: 'oscuro' })).toContain('{other}');
    });

    test('sin variables devuelve la plantilla tal cual', () => {
        expect(translate('es', 'nav.notes')).toBe('Notas');
    });
});

describe('los diccionarios', () => {
    // La igualdad de claves la garantiza `tsc` (en.ts se declara Dictionary).
    // Estos tests cubren lo que el tipo NO puede ver.

    test('ningún texto quedó sin traducir por olvido', () => {
        // Las claves que legítimamente comparten valor en los dos idiomas: cifras,
        // símbolos y marcadores de posición.
        const iguales = new Set([
            // `MMMM?` no es una palabra, es un RUIDO: la máquina no sabe cómo
            // llamar a lo que lleva registrado. Traducirlo sería darle un
            // nombre, que es justo lo que el rótulo dice que no tiene.
            'diag.secrets',
            'common.dash',
            'nav.datePlaceholder',
            'sidebar.noTime',
            // Símbolos y rótulos de máquina que se leen igual en los dos
            // idiomas. `Editor_core` es una etiqueta de sección tipo código,
            // como `// EDITOR_CORE`; traducirla la volvería prosa.
            'editor.core',
            'trash.busy',
            // "Error 500" y "[ERROR]" se escriben igual en los dos idiomas.
            'error.withStatus',
            'status.error',
            // `vsync-test` es el NOMBRE DEL PROCESO, no prosa: es el mismo
            // identificador que lista `//ps`, igual que `autosave` o
            // `scanline`. Traducirlo rompería la pista que lo delata — quien
            // lo vio en la tabla tiene que reconocerlo al abrirlo.
            'pong.title',
            'diag.pongClean',
        ]);

        const sospechosas = (Object.keys(es) as (keyof typeof es)[]).filter(
            (key) => es[key] === en[key] && !iguales.has(key)
        );

        expect(sospechosas).toEqual([]);
    });

    test('las dos versiones usan las mismas variables', () => {
        const variables = (texto: string) =>
            [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

        for (const key of Object.keys(es) as (keyof typeof es)[]) {
            expect({ key, vars: variables(en[key]) }).toEqual({
                key,
                vars: variables(es[key]),
            });
        }
    });

    test('SYSTEM nunca se calca como SISTEMA', () => {
        // `[SISTEMA_OK]` se lee como una app traducida; `[SYSTEM_OK]` se lee
        // como una máquina. El calco no se usa en ninguna clave.
        for (const key of Object.keys(es) as (keyof typeof es)[]) {
            expect({ key, calco: /SISTEMA_/.test(es[key]) }).toEqual({
                key,
                calco: false,
            });
        }
    });

    test('donde el español usa SYSTEM, es el mismo token que el inglés', () => {
        // La regla es NO CALCAR, no "no traducir": el español puede tener su
        // propio token (`[SIN_ARCHIVOS]` frente a `[SYSTEM_EMPTY]`). Pero si
        // decide usar SYSTEM, tiene que ser exactamente el mismo que el inglés
        // — un `[SYSTEM_VACÍO]` a medias sería lo peor de los dos mundos.
        for (const key of Object.keys(es) as (keyof typeof es)[]) {
            if (!es[key].includes('SYSTEM')) continue;

            expect({ key, es: es[key] }).toEqual({ key, es: en[key] });
        }
    });

    test('ningún texto está vacío', () => {
        for (const key of Object.keys(es) as (keyof typeof es)[]) {
            expect({ key, es: es[key].trim() === '' }).toEqual({ key, es: false });
            expect({ key, en: en[key].trim() === '' }).toEqual({ key, en: false });
        }
    });
});
