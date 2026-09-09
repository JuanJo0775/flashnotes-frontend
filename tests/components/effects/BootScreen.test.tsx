// tests/components/effects/BootScreen.test.tsx

/**
 * EL RECORRIDO DEL ARRANQUE, montado.
 *
 * Se apaga, barras, rótulo, comprobación, y a casa. El guion ya está probado
 * aparte; lo que se comprueba acá es lo que aquel no puede ver: que las fases se
 * pintan, que el apagón es EL MISMO elemento del fallo crítico, y que con el
 * bloqueo puesto no hay ni apagón ni rótulo.
 *
 * Estas fases duran entre cuatrocientos milisegundos y ocho segundos y no se
 * dejan fotografiar entre dos llamadas al navegador. Acá sí.
 */

import { render, act } from '@testing-library/react';
import BootScreen from '@/components/effects/BootScreen';
import { forgetV02Cache } from '@/lib/system/v02';

/**
 * Pone o quita el bloqueo EN EL ALMACENAMIENTO, que es de donde lo lee.
 *
 * Se lee de ahí y no del estado de React porque `useSyncExternalStore` devuelve
 * el snapshot del servidor en el primer render del cliente, y ahí el bloqueo
 * siempre es `false`.
 */
const conBloqueo = (puesto: boolean) => {
    localStorage.clear();
    if (puesto) {
        localStorage.setItem(
            'flashnotes:lockout',
            JSON.stringify({ until: Date.now() + 600_000 })
        );
    }
};

beforeEach(() => {
    jest.useFakeTimers();

    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
});

afterEach(() => jest.useRealTimers());

/**
 * Adelanta el reloj VARIAS VECES.
 *
 * Cada fase agenda la siguiente desde su propio efecto, y ese efecto no corre
 * hasta que React vuelve a pintar — cosa que pasa al SALIR de `act`, no dentro.
 */
const correElGuion = (veces: number, ms = 9_000) => {
    for (let i = 0; i < veces; i += 1) {
        act(() => {
            jest.advanceTimersByTime(ms);
        });
    }
};

describe('el arranque normal', () => {
    it('EMPIEZA APAGÁNDOSE, con el elemento del fallo crítico', () => {
        // Recargar es apagar y encender. Y el apagón no es uno nuevo: es
        // `.collapse-dying`, el mismo que se ve tras la estática y las franjas.
        // Un gesto, una animación.
        conBloqueo(false);
        render(<BootScreen onDone={() => {}} />);
        // Un tic para que lea el almacenamiento: hasta entonces tapa y no
        // enseña nada, que es mucho menos malo que enseñar la app.
        correElGuion(1, 0);

        expect(document.querySelector('.collapse-dying')).not.toBeNull();
        expect(document.querySelector('.boot-bars')).toBeNull();
    });

    it('⚠ y se ENCIENDE antes de que haya imagen', () => {
        /*
         * La misma figura del apagón al revés: un punto que se abre en línea y
         * la línea en imagen. Vivía sólo en la puerta del arranque, así que un
         * reinicio pedido desde dentro —`//reboot`— pasaba del apagón a las
         * barras sin encenderse, o sea sin la mitad que se oye.
         */
        conBloqueo(false);
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);

        correElGuion(1);

        expect(document.querySelector('.tube-on')).not.toBeNull();
        expect(document.querySelector('.boot-bars')).toBeNull();
    });

    it('después las barras, el rótulo y la comprobación', () => {
        conBloqueo(false);
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);

        correElGuion(2);
        expect(document.querySelector('.boot-bars')).not.toBeNull();

        correElGuion(1);
        expect(document.querySelector('.boot-logo')).not.toBeNull();

        correElGuion(1);
        expect(document.querySelector('.boot-check')).not.toBeNull();
    });

    it('y avisa al terminar', () => {
        conBloqueo(false);
        const listo = jest.fn();
        render(<BootScreen onDone={listo} />);

        correElGuion(7);

        expect(listo).toHaveBeenCalled();
    });

    it('mientras dura, la app está tapada', () => {
        // El atributo es lo que la mantiene a opacidad cero. Sin él, el arranque
        // sería una pantalla encima de otra que se sigue viendo.
        conBloqueo(false);
        const { unmount } = render(<BootScreen onDone={() => {}} />);

        expect(document.documentElement).toHaveAttribute('data-booting');

        unmount();
        expect(document.documentElement).not.toHaveAttribute('data-booting');
    });
});

describe('con el bloqueo puesto', () => {
    it('ni se apaga ni enseña el rótulo: sólo las barras', () => {
        // Un equipo bloqueado no se apagó, se quedó colgado — y enseñarle el
        // rótulo del fabricante sería contarle que arrancó bien justo antes de
        // decirle que no arrancó.
        conBloqueo(true);
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);

        expect(document.querySelector('.collapse-dying')).toBeNull();
        expect(document.querySelector('.boot-bars')).not.toBeNull();

        correElGuion(1);
        expect(document.querySelector('.boot-logo')).toBeNull();
    });

    it('y termina enseguida', () => {
        const listo = jest.fn();
        conBloqueo(true);
        render(<BootScreen onDone={listo} />);

        correElGuion(4);

        expect(listo).toHaveBeenCalled();
    });
});

describe('⚠ el arranque de la v0.2, que es otra máquina', () => {
    /*
     * No es éste con piezas quitadas: es la 1.0 ANTES de que se escribieran. No
     * hay carta de ajuste porque no tiene nada que emitir, no hay rótulo porque
     * nadie firmó esa versión, y no cuenta la memoria porque no sabe cuánta
     * tiene.
     *
     * El guion ya está probado aparte; acá se mira lo que aquél no puede ver:
     * que las dos pantallas nuevas se PINTAN, y que ninguna de la 1.0 se cuela.
     */
    const enV02 = () => {
        localStorage.clear();
        localStorage.setItem('flashnotes:v02', 'on');
        // El módulo cachea la respuesta en memoria: sin esto, un test anterior
        // que ya preguntó deja la caché puesta y éste mediría la otra versión.
        forgetV02Cache();
    };

    it('recibe corriente con SU marca, no con la del tubo limpio', () => {
        // La figura es la misma —el mismo cristal— y la marca es otra, porque lo
        // que las distingue es el sonido: acá se suelta algo dentro de la caja.
        enV02();
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);
        correElGuion(1);

        expect(document.querySelector('.v02-wake')).not.toBeNull();
        expect(document.querySelector('.tube-on')).toBeNull();
    });

    it('enseña estática donde la otra enseña la carta de ajuste', () => {
        enV02();
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);
        correElGuion(2);

        expect(document.querySelector('.v02-static')).not.toBeNull();
        expect(document.querySelector('.boot-bars')).toBeNull();
    });

    it('y después la barra que se inventa el total', () => {
        enV02();
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);
        correElGuion(3);

        const barra = document.querySelector('.v02-load');
        expect(barra).not.toBeNull();
        // La barra de esa versión, con sus corchetes y su porcentaje.
        expect(barra!.textContent).toMatch(/^\[[#.]+\]\s+\d+%$/);
    });

    it('⚠ y NUNCA se le cuela el rótulo del fabricante', () => {
        // Sería un fabricante firmando una versión que nadie firmó.
        enV02();
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);

        for (let i = 0; i < 6; i += 1) {
            correElGuion(1);
            expect(document.querySelector('.boot-logo')).toBeNull();
            expect(document.querySelector('.boot-check')).toBeNull();
        }
    });
});
