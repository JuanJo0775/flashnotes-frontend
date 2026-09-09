// tests/components/layout/PowerButton.test.tsx

/**
 * EL BOTÓN DE ENCENDIDO: HAY QUE MANTENERLO.
 *
 * ⚠ POR QUE NO ES UN CLIC. Un toque suelto costaria el ciclo entero —ocho
 * segundos de apagado y arranque, sin forma de cancelar— y esta pegado a la
 * barra de estado, o sea al alcance de cualquier roce. Ninguna maquina se
 * reinicia de un roce: hay que apretar y sostener.
 *
 * Y sale gratis en el idioma del producto: lo que en una interfaz normal seria
 * un dialogo de confirmacion —«¿seguro?»— aca es el gesto fisico que ya existe.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import PowerButton, { HOLD_MS, RELEASE_MS } from '@/components/layout/PowerButton';
import { es } from '@/i18n/es';
import { en } from '@/i18n/en';

/** Un `pointerdown` de verdad: jsdom no trae PointerEvent, y con `click` no vale. */
function apretar(el: Element) {
    fireEvent.pointerDown(el);
}

beforeEach(() => {
    jest.useFakeTimers();
});

afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
});

describe('sostener lo enciende', () => {
    it('⚠ un toque suelto NO hace nada', () => {
        /*
         * Es la razon de ser del componente. Si soltar antes de tiempo
         * reiniciara igual, el gesto seria decorativo y el accidente seguiria
         * ahi.
         */
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);
        const boton = screen.getByRole('button');

        apretar(boton);
        jest.advanceTimersByTime(HOLD_MS - 100);
        fireEvent.pointerUp(window);

        jest.advanceTimersByTime(2_000);

        expect(reiniciar).not.toHaveBeenCalled();
    });

    it('y sostenerlo hasta el final sí', () => {
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);

        apretar(screen.getByRole('button'));
        act(() => {
            jest.advanceTimersByTime(HOLD_MS);
        });

        expect(reiniciar).toHaveBeenCalledTimes(1);
    });

    it('⚠ y soltar FUERA del boton tambien lo cancela', () => {
        /*
         * Sin esto, arrastrar el puntero a otro sitio dejaria la cuenta
         * corriendo y la maquina se reiniciaria sola un rato despues — el peor
         * fallo posible en un boton que existe para evitar sorpresas.
         */
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);

        apretar(screen.getByRole('button'));
        fireEvent.pointerUp(window);
        jest.advanceTimersByTime(2_000);

        expect(reiniciar).not.toHaveBeenCalled();
    });

    it('⚠ y si el boton se va a mitad de la cuenta, no reinicia despues', () => {
        // El arranque tapa la barra entera. Un temporizador que sobreviva al
        // desmontaje dispara sobre una pantalla que ya no es la suya.
        const reiniciar = jest.fn();
        const { unmount } = render(<PowerButton onReboot={reiniciar} />);

        apretar(screen.getByRole('button'));
        unmount();
        jest.advanceTimersByTime(2_000);

        expect(reiniciar).not.toHaveBeenCalled();
    });
});

describe('⚠ con teclado se activa directo, y no es una excepcion', () => {
    /*
     * Sostener una tecla no es un gesto que un lector de pantalla pueda anunciar
     * ni que todo el mundo pueda hacer. Y la intencion ya esta probada de otra
     * forma: llegar hasta aca con el tabulador es deliberado, mientras que
     * rozarlo con el raton no. La proteccion es contra el ACCIDENTE, y por
     * teclado no hay accidente.
     */
    it.each([['Enter'], [' ']])('«%s» reinicia', (key) => {
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);

        fireEvent.keyDown(screen.getByRole('button'), { key });

        expect(reiniciar).toHaveBeenCalledTimes(1);
    });

    it('pero mantener la tecla no vale por diez reinicios', () => {
        // El navegador repite `keydown` mientras la tecla siga apretada.
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);
        const boton = screen.getByRole('button');

        fireEvent.keyDown(boton, { key: 'Enter' });
        fireEvent.keyDown(boton, { key: 'Enter', repeat: true });
        fireEvent.keyDown(boton, { key: 'Enter', repeat: true });

        expect(reiniciar).toHaveBeenCalledTimes(1);
    });

    it('y otras teclas no lo tocan', () => {
        const reiniciar = jest.fn();
        render(<PowerButton onReboot={reiniciar} />);

        fireEvent.keyDown(screen.getByRole('button'), { key: 'a' });
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Escape' });

        expect(reiniciar).not.toHaveBeenCalled();
    });
});

describe('⚠ lo que se ve cabe en la reja de la monoespaciada', () => {
    it.each([['es'], ['en']])('el rotulo de «%s» es ASCII puro', (lang) => {
        /*
         * MEDIDO EN EL NAVEGADOR, y es la clase de fallo que no se ve leyendo.
         *
         * Aca habia un `⏻` (U+23FB, POWER SYMBOL) y el boton salia VACIO:
         * JetBrains Mono no lo trae. Ese caracter ocupaba 14 px mientras los
         * glifos de verdad ocupan 8,4 — o sea que caia al sustituto y se
         * pintaba en blanco. Nada fallaba; simplemente no habia boton.
         *
         * No es mala suerte de un caracter suelto: esta app se escribe entera
         * en una monoespaciada y en ASCII, y un simbolo bonito fuera de esa
         * reja es una apuesta a que la fuente lo tenga.
         */
        const dic = lang === 'es' ? es : en;
        const rotulo = dic['power.label'];

        expect(rotulo).toMatch(/^[ -~]+$/);
    });
});

describe('⚠ el boton y //reboot son EXACTAMENTE lo mismo', () => {
    it('los dos piden el mismo reinicio, no uno cada uno', () => {
        /*
         * Se pidio asi: «ese restart debe funcionar exactamente igual que el
         * reboot». Dos cierres identicos cumplen eso el primer dia y se separan
         * el dia que alguien ajuste uno — no habria error, solo dos reinicios
         * que ya no son el mismo, y nadie se enteraria hasta oirlo.
         *
         * La garantia no es que hoy digan lo mismo: es que solo hay UNA funcion
         * y las dos la reciben.
         */
        const page = readFileSync('src/app/page.tsx', 'utf8');

        // Un unico sitio que decide desde donde arranca.
        expect(page.match(/setBooting\('off'\)/g)).toHaveLength(1);

        // Y las dos puertas —la barra y el editor— reciben esa misma.
        expect(page.match(/onReboot=\{reiniciar\}/g)).toHaveLength(2);
    });
});

describe('⚠ el relleno se ve subir, y bajar al soltar', () => {
    /*
     * ⚠ ESTO NACIO COMO UNA TRANSICION DE CSS Y NO CORRIA. Se midio en el
     * navegador —con el movimiento reducido apagado y en un elemento aislado— y
     * `clip-path` se quedaba clavado en el valor inicial: el boton se sostenia y
     * no se veia nada. Se reporto tal cual: «no se ve la animacion de que el
     * boton se va oprimiendo».
     *
     * A pasos no puede fallar. Y el dibujo sale del MISMO contador que dispara
     * el reinicio, asi que no puede mentir sobre cuanto falta.
     */
    const recorte = () => screen.getByRole('button').querySelector('.power-fill') as HTMLElement;

    /** Cuanto se ve, de 0 a 1. El recorte tapa por ARRIBA lo que falta. */
    const lleno = () => {
        const m = /inset\(([\d.]+)%/.exec(recorte().style.clipPath);
        return m ? 1 - Number(m[1]) / 100 : 0;
    };

    it('empieza vacio', () => {
        render(<PowerButton onReboot={jest.fn()} />);

        expect(lleno()).toBe(0);
    });

    it('⚠ y SUBE mientras se sostiene', () => {
        render(<PowerButton onReboot={jest.fn()} />);

        apretar(screen.getByRole('button'));

        act(() => {
            jest.advanceTimersByTime(HOLD_MS / 4);
        });
        const aUnCuarto = lleno();

        act(() => {
            jest.advanceTimersByTime(HOLD_MS / 4);
        });

        expect(aUnCuarto).toBeGreaterThan(0);
        expect(lleno()).toBeGreaterThan(aUnCuarto);
    });

    it('⚠ y BAJA al soltar, en vez de cortarse de golpe', () => {
        // Es lo que hace un deposito que deja de llenarse. Cortarlo en seco
        // contaria que no habia pasado nada, y si habia pasado: lo soltaste.
        render(<PowerButton onReboot={jest.fn()} />);

        apretar(screen.getByRole('button'));
        act(() => {
            jest.advanceTimersByTime(HOLD_MS / 2);
        });
        const alSoltar = lleno();

        act(() => {
            fireEvent.pointerUp(window);
            jest.advanceTimersByTime(RELEASE_MS / 3);
        });
        const bajando = lleno();

        expect(bajando).toBeLessThan(alSoltar);
        expect(bajando).toBeGreaterThan(0);

        act(() => {
            jest.advanceTimersByTime(RELEASE_MS);
        });

        expect(lleno()).toBe(0);
    });
});
