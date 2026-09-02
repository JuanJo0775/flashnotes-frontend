// tests/lib/system/boot.test.ts

/**
 * EL ENCENDIDO DEL MONITOR.
 *
 * Barras, rótulo, comprobación, y a trabajar. Se prueba el guion sin montar
 * nada, que es de lo que sirve tenerlo aparte.
 */

import {
    bootAt,
    bootScript,
    bootDuration,
    bootCheckLines,
    BOOT_BARS,
    BOOT_LOGO,
    BOOT_MIN_MS,
    BOOT_MAX_MS,
} from '@/lib/system/boot';

const guion = bootScript(4_000);

describe('el guion', () => {
    it('enciende el tubo antes de nada', () => {
        expect(bootAt(guion, 0).phase).toBe('on');
    });

    it('y luego va en orden: barras, rótulo, comprobación', () => {
        expect(bootAt(guion, 1).phase).toBe('bars');
        expect(bootAt(guion, 2).phase).toBe('logo');
        expect(bootAt(guion, 3).phase).toBe('check');
    });

    it('y termina', () => {
        expect(bootAt(guion, 4).phase).toBe('done');
        expect(bootAt(guion, 99).phase).toBe('done');
    });

    it('cada tramo dura algo', () => {
        for (const i of [0, 1, 2, 3]) {
            expect(bootAt(guion, i).ms).toBeGreaterThan(0);
        }
    });

    it('el rótulo se lleva la mitad: es lo único que hay que MIRAR', () => {
        const total = 4_000;
        const logo = bootScript(total).find((p) => p.phase === 'logo');

        expect(logo?.ms).toBe(total / 2);
    });
});

describe('cuánto tarda en arrancar', () => {
    it('cambia en cada encendido', () => {
        // Un equipo de verdad no tarda siempre lo mismo. Uno cronometrado se
        // siente como una animación; éste se siente como una máquina.
        const cortos = bootDuration(() => 0);
        const largos = bootDuration(() => 1);

        expect(cortos).not.toBe(largos);
    });

    it('siempre entre dos y ocho segundos', () => {
        for (const dado of [0, 0.3, 0.7, 1]) {
            const ms = bootDuration(() => dado);
            expect(ms).toBeGreaterThanOrEqual(BOOT_MIN_MS);
            expect(ms).toBeLessThanOrEqual(BOOT_MAX_MS);
        }
    });

    it('el reparto suma lo que se sorteó, más el encendido', () => {
        // Si el reparto no sumara el total, el arranque duraría otra cosa que la
        // que dice durar, y el sorteo dejaría de significar nada.
        const total = 6_000;
        const suma = bootScript(total)
            .filter((p) => p.phase !== 'on')
            .reduce((t, p) => t + p.ms, 0);

        expect(suma).toBe(total);
    });
});

describe('las barras', () => {
    it('son siete, como las de verdad', () => {
        expect(BOOT_BARS).toHaveLength(7);
    });

    it('van de más clara a más oscura', () => {
        // En cualquier otro orden se ven como rayas de colores. En éste se
        // reconocen como una carta de ajuste.
        // LUMA, no la suma de los tres canales. Las barras de verdad se ordenan
        // por brillo PERCIBIDO, y el ojo no pesa igual el verde que el azul: con
        // la suma a secas, magenta y cian salen empatados y el orden real —el
        // que hace que se reconozcan— parece equivocado.
        const luz = (hex: string) =>
            0.299 * parseInt(hex.slice(1, 3), 16) +
            0.587 * parseInt(hex.slice(3, 5), 16) +
            0.114 * parseInt(hex.slice(5, 7), 16);

        const luces = BOOT_BARS.map(luz);

        for (let i = 1; i < luces.length; i += 1) {
            expect(luces[i]).toBeLessThanOrEqual(luces[i - 1]);
        }
    });
});

describe('el rótulo', () => {
    it('todas las líneas miden lo mismo', () => {
        // En una rejilla de caracteres, una línea más corta descuadra el dibujo
        // aunque los glifos alineen.
        const anchos = new Set(BOOT_LOGO.map((l) => l.length));
        expect(anchos.size).toBe(1);
    });

    it('es ASCII imprimible, sin bloques', () => {
        // Los bloques no están en JetBrains Mono: los pintaría una fuente de
        // reserva con otras métricas y el rótulo bailaría (REGLAS · C8).
        for (const l of BOOT_LOGO) expect(l).toMatch(/^[\x20-\x7E]+$/);
    });
});

describe('la comprobación', () => {
    it('dice varias cosas y acaba arrancando', () => {
        const l = bootCheckLines();

        expect(l.length).toBeGreaterThan(3);
        expect(l[l.length - 1]).toMatch(/FLASH-NOTES/);
    });
});
