// tests/components/effects/CollapseV02.test.tsx

/**
 * EN LA v0.2, EL FALLO TOTAL NO SE RESUELVE SOLO.
 *
 * ⚠ Y NO ES QUE ESTÉ MÁS ROTA. Es la regla de esa versión entera, la misma que
 * gobierna sus comandos: lo que no está ahí no está porque nadie lo escribió
 * todavía. La rutina que levanta la máquina después de un colapso es de las que
 * se escribieron después, así que ahí la máquina intenta volver, no puede, y se
 * queda encendida con el error puesto.
 *
 * Se pidió jugando: «en el 0.2 también debe cambiar un poco cómo se comporta el
 * fallo total, ahí es imposible resolverlo».
 *
 * ⚠ IMPOSIBLE DE RESOLVER NO ES IMPOSIBLE DE SALIR. Lo que no vuelve es el
 * sistema por su cuenta; el interruptor de abajo y `//reboot` siguen ahí, y la
 * pantalla lo DICE. Una pantalla quieta que no dice cómo salir no se lee como
 * una máquina detenida: se lee como que la app se colgó (REGLAS · A4).
 */

import { render, act, screen, fireEvent } from '@testing-library/react';
import SystemCollapse from '@/components/effects/SystemCollapse';
import { forgetV02Cache } from '@/lib/system/v02';
import { levelFor, LOCKOUT_MS } from '@/lib/system/collapseEscalation';
import { registerCollapse, getSystemState } from '@/hooks/useSystemState';

beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    forgetV02Cache();

    window.matchMedia = jest.fn().mockImplementation((q: string) => ({
        matches: false,
        media: q,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    }));
});

afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
    forgetV02Cache();
});

const enV02 = () => {
    localStorage.setItem('flashnotes:v02', 'on');
    forgetV02Cache();
};

/** El primer colapso, que en la 1.0 termina bien. */
const primero = () => levelFor(1);

/**
 * Deja correr la secuencia entera, A TRAMOS.
 *
 * ⚠ EN UN SOLO SALTO NO SIRVE, y cuesta un rato descubrirlo: la barra se arma
 * en un efecto que no existe hasta que la fase pasa a `reboot`, y esa fase no
 * llega hasta que React vuelve a pintar — cosa que ocurre al SALIR de `act`, no
 * dentro. Un `advanceTimersByTime(40_000)` de una sola vez dispara los
 * temporizadores de las fases y no llega a correr nunca el intervalo de la
 * barra: el rearranque de la 1.0 no termina y el test miente.
 */
const correr = (veces = 12, ms = 4_000) => {
    for (let i = 0; i < veces; i += 1) {
        act(() => {
            jest.advanceTimersByTime(ms);
        });
    }
};

describe('la v0.2 se detiene', () => {
    it('⚠ nunca avisa de que terminó: no termina', () => {
        const listo = jest.fn();
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={listo} />);
        correr();

        expect(listo).not.toHaveBeenCalled();
    });

    it('y la 1.0 sí vuelve, como siempre', () => {
        // El mismo nivel sin la versión vieja puesta. Si alguien unificara las
        // dos ramas, este test es el que lo dice.
        const listo = jest.fn();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={listo} />);
        correr();

        expect(listo).toHaveBeenCalled();
    });

    it('⚠ y dice cómo salir, que es lo que la separa de un cuelgue', () => {
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);
        correr();

        const texto = document.body.textContent ?? '';
        expect(texto).toContain('DETENIDO');
        expect(texto).toMatch(/REINICIE A MANO/);
    });

    it('cuenta POR QUÉ no vuelve, y no es que esté más rota', () => {
        // «SIN RUTINA DE RECUPERACIÓN»: le falta un trozo que no se escribió,
        // que es la diferencia entre esta versión y una máquina averiada.
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);
        correr();

        expect(document.body.textContent).toContain('SIN RUTINA DE RECUPERACION');
    });

    it('⚠ y la marca cambia, o el disco seguiría buscando para siempre', () => {
        /*
         * `.collapse-reboot` es la máquina LEYENDO para volver: trae el cabezal
         * y lo repite cada segundo y medio mientras la marca esté puesta. Una
         * máquina que se rindió no lee nada.
         */
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);
        correr();

        expect(document.querySelector('.collapse-halted')).not.toBeNull();
        expect(document.querySelector('.collapse-reboot')).toBeNull();
    });

    it('la barra que se traba es la SUYA, la de 40 columnas', () => {
        // Los bloques `▮▯` de la 1.0 no están en la monoespaciada de la casa, y
        // esta versión no iba a estrenar el carácter más moderno de las dos.
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);
        correr();

        const barra = document.querySelector('.collapse-progress')!;
        expect(barra.textContent).toMatch(/^\[[#.]+\]\s+\d+%$/);
        expect(barra.textContent).not.toContain('▮');
    });

    it('⚠ y no enseña las barras de color: no tiene carta de ajuste', () => {
        /*
         * Igual que su arranque, que pone estática donde la otra pone barras.
         * Una versión que no tiene nada que emitir no emite una carta de ajuste
         * justo cuando se está cayendo.
         */
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);

        for (let i = 0; i < 12; i += 1) {
            act(() => {
                jest.advanceTimersByTime(300);
            });
            expect(document.querySelector('.collapse-bars')).toBeNull();
        }
    });

    it('con movimiento reducido llega al mismo sitio, sin el camino', () => {
        // A3: quien pide menos movimiento pide no marearse, no perderse lo que
        // pasa. Y lo que pasa acá es que la máquina se detuvo.
        window.matchMedia = jest.fn().mockImplementation((q: string) => ({
            matches: true,
            media: q,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
        }));
        const listo = jest.fn();
        enV02();

        render(<SystemCollapse notesCount={3} level={primero()} onDone={listo} />);
        correr();

        expect(document.querySelector('.collapse-halted')).not.toBeNull();
        expect(listo).not.toHaveBeenCalled();
    });
});

describe('⚠ la consola de emergencia', () => {
    /*
     * Se pidió jugando: «abre una mini consola y ahí tienes que poner reboot
     * para salir; si no, se queda en esa pantalla de fallo durante 5 minutos».
     *
     * Es el equivalente del puzzle del bloqueo de la 1.0, y es UNA palabra
     * escrita en la pantalla: aquella máquina decidió echarte y quiere ver si
     * merecés volver; ésta no decidió nada —se paró—, así que no hay nada que
     * merecer. Hay que darle la orden a mano.
     */
    const escribir = (texto: string) => {
        const campo = screen.getByLabelText(/escriba reboot/i);
        fireEvent.change(campo, { target: { value: texto } });
        fireEvent.submit(campo.closest('form')!);
    };

    it('aparece cuando la máquina se detiene, y no antes', () => {
        enV02();
        render(<SystemCollapse notesCount={3} level={primero()} onDone={() => {}} />);

        expect(screen.queryByLabelText(/escriba reboot/i)).toBeNull();

        correr();
        expect(screen.getByLabelText(/escriba reboot/i)).toBeInTheDocument();
    });

    it('⚠ «reboot» apaga y enciende de verdad', () => {
        // No es `onDone`: aquél dice «el sistema se recuperó», y acá no hay
        // ninguna recuperación que anunciar.
        const listo = jest.fn();
        const interruptor = jest.fn();
        enV02();

        render(
            <SystemCollapse
                notesCount={3}
                level={primero()}
                onDone={listo}
                onManualReboot={interruptor}
            />
        );
        correr();
        escribir('reboot');

        expect(interruptor).toHaveBeenCalledTimes(1);
        expect(listo).not.toHaveBeenCalled();
    });

    it('y con las barras del prefijo también, que es como se aprendió', () => {
        // Quien lleva media partida tecleando `//reboot` va a escribirlo con
        // ellas, y castigar eso sería castigar haber aprendido la casa.
        const interruptor = jest.fn();
        enV02();

        render(
            <SystemCollapse
                notesCount={3}
                level={primero()}
                onDone={() => {}}
                onManualReboot={interruptor}
            />
        );
        correr();
        escribir('//reboot');

        expect(interruptor).toHaveBeenCalled();
    });

    it('⚠ y cualquier otra cosa CONTESTA, en vez de quedarse muda', () => {
        /*
         * Sin réplica, teclear algo y no ver nada se lee como que el teclado
         * tampoco funciona — y entonces la pantalla pasa de detenida a rota.
         */
        const interruptor = jest.fn();
        enV02();

        render(
            <SystemCollapse
                notesCount={3}
                level={primero()}
                onDone={() => {}}
                onManualReboot={interruptor}
            />
        );
        correr();
        escribir('ayuda');

        expect(interruptor).not.toHaveBeenCalled();
        expect(document.body.textContent).toContain('ORDEN NO RECONOCIDA');
    });

    it('⚠ y si nadie escribe, la guarda corta a los cinco minutos', () => {
        /*
         * Los mismos cinco minutos del bloqueo, contados por la otra máquina.
         * Y lo que la levanta NO es que el sistema se recupere —esa rutina es la
         * que no existe acá— sino el temporizador de guarda, que es una pieza
         * del aparato: cuando nadie contesta, corta la corriente y la da otra
         * vez.
         */
        const interruptor = jest.fn();
        enV02();

        render(
            <SystemCollapse
                notesCount={3}
                level={primero()}
                onDone={() => {}}
                onManualReboot={interruptor}
            />
        );
        correr();
        expect(interruptor).not.toHaveBeenCalled();

        act(() => {
            jest.advanceTimersByTime(LOCKOUT_MS + 1_000);
        });

        expect(interruptor).toHaveBeenCalledTimes(1);
    });

    it('⚠ y la guarda NO se rearma porque la página repinte', () => {
        /*
         * El fallo de esta casa que ya apareció cuatro veces: el padre pasa una
         * función nueva en cada render y la página repinta sola una vez por
         * segundo. Con la función en las dependencias, el temporizador volvía a
         * empezar en cada repintado y no vencía nunca.
         */
        const interruptor = jest.fn();
        enV02();

        const { rerender } = render(
            <SystemCollapse
                notesCount={3}
                level={primero()}
                onDone={() => {}}
                onManualReboot={() => interruptor()}
            />
        );
        correr();

        for (let i = 0; i < 8; i += 1) {
            act(() => {
                jest.advanceTimersByTime(40_000);
            });
            rerender(
                <SystemCollapse
                    notesCount={3}
                    level={primero()}
                    onDone={() => {}}
                    onManualReboot={() => interruptor()}
                />
            );
        }

        expect(interruptor).toHaveBeenCalled();
    });
});

describe('⚠ y ahí no está la pantalla de fallo total de la 1.0', () => {
    /*
     * Se pidió: «ahí es fallo total a la primera, y ahí no está la pantalla de
     * fallo total que en la 1.0».
     *
     * La escalada —seis colapsos, la ventana, el bloqueo con su puzzle— es una
     * máquina que aprende de lo que le hacés. Esta versión no aprende nada: se
     * rompe entera al primer golpe. Y no te echa, porque echarte es una decisión
     * y ésta no decide: se para.
     */
    it('el primer colapso ya es el terminal', () => {
        enV02();

        const nivel = registerCollapse();

        expect(nivel.lockout).toBe(false);
        expect(nivel.intensity).toBe(3);
    });

    it('y no deja el sistema bloqueado', () => {
        enV02();

        registerCollapse();

        expect(getSystemState().lockedOut).toBe(false);
    });

    it('⚠ ni siquiera con la señal ya rota, que en la 1.0 va directo al bloqueo', () => {
        enV02();

        // Diez colapsos seguidos: en la 1.0, seis bastan.
        for (let i = 0; i < 10; i += 1) registerCollapse();

        expect(getSystemState().lockedOut).toBe(false);
    });

    it('y la 1.0 sigue echándote igual', () => {
        // El mismo bucle sin la versión vieja puesta.
        for (let i = 0; i < 8; i += 1) registerCollapse();

        expect(getSystemState().lockedOut).toBe(true);
    });
});
