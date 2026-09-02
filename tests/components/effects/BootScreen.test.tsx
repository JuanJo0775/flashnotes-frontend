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

    it('después las barras, el rótulo y la comprobación', () => {
        conBloqueo(false);
        render(<BootScreen onDone={() => {}} />);
        correElGuion(1, 0);

        correElGuion(1);
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

        correElGuion(6);

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
