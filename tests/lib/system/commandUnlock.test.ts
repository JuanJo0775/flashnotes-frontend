// tests/lib/system/commandUnlock.test.ts
import {
    clearUsed,
    isUnlocked,
    markUsed,
    readUsed,
    redact,
} from '@/lib/system/commandUnlock';

beforeEach(() => {
    localStorage.clear();
    clearUsed();
});

describe('commandUnlock · se desbloquean al USARLOS', () => {
    // Encontrar el nombre por ahí no basta: hay que teclearlo. Ver no es
    // descubrir, y un comando que se desbloqueara con sólo leerlo convertiría
    // cualquier fuga en una entrega.
    test('al principio no hay ninguno', () => {
        expect(readUsed().size).toBe(0);
    });

    test('usarlo lo desbloquea', () => {
        markUsed('//panic');

        expect(isUnlocked('//panic')).toBe(true);
    });

    test('no desbloquea a los demás', () => {
        markUsed('//panic');

        expect(isUnlocked('//ps')).toBe(false);
    });

    test('la primera vez lo dice; la segunda ya no', () => {
        expect(markUsed('//ps')).toBe(true);
        expect(markUsed('//ps')).toBe(false);
    });

    test('sobrevive a recargar', () => {
        // Vive en `localStorage`: releerlo de cero tiene que dar lo mismo, que
        // es lo que pasa al volver a abrir la pestaña.
        markUsed('//ps');

        expect(readUsed().has('//ps')).toBe(true);
        expect(isUnlocked('//ps')).toBe(true);
    });

    test('un almacenamiento roto no rompe nada', () => {
        localStorage.setItem('flashnotes:cmds', 'no soy json');
        clearUsed();

        expect(readUsed().size).toBe(0);
        expect(() => markUsed('//ps')).not.toThrow();
    });

    test('reiniciar los borra todos', () => {
        markUsed('//ps');
        markUsed('//panic');
        localStorage.removeItem('flashnotes:cmds');
        clearUsed();

        expect(readUsed().size).toBe(0);
    });
});

describe('commandUnlock · el tachón', () => {
    test('no deja ver el nombre', () => {
        expect(redact('//panic')).not.toBe('//panic');
    });

    test('conserva el largo', () => {
        // Saber que mide cinco letras es una pista de verdad —se cruza con lo
        // que sueltan las ventanas de error— sin regalar nada.
        expect(redact('//panic')).toHaveLength('//panic'.length);
        expect(redact('//ps')).toHaveLength('//ps'.length);
    });

    test('conserva el prefijo, para que se lea como un comando', () => {
        expect(redact('//panic').startsWith('//')).toBe(true);
    });

    test('sólo letras debajo del prefijo', () => {
        expect(redact('//date_off').slice(2)).toMatch(/^[a-z]+$/);
    });

    test('el guion bajo también se tacha', () => {
        // Dejar la forma `//xxxx_xxx` delataría a `//date_off` de un vistazo.
        expect(redact('//date_off')).not.toContain('_');
    });

    test('es determinista: el mismo comando da el mismo tachón', () => {
        // Si se sorteara en cada tirada, la lista bailaría cada vez que pidieras
        // la ayuda y se leería como ruido en vez de como algo tachado.
        expect(redact('//panic')).toBe(redact('//panic'));
    });

    test('dos comandos distintos dan tachones distintos', () => {
        expect(redact('//panic')).not.toBe(redact('//chaos'));
    });

    test('ninguno de los comandos reales se tacha en sí mismo', () => {
        const todos = [
            '//whoami', '//sudo', '//uptime', '//ps', '//log', '//history',
            '//diag', '//chaos', '//panic', '//date_off', '//art', '//keep',
            '//hi',
        ];

        for (const c of todos) {
            expect(redact(c)).not.toBe(c);
        }
    });
});
