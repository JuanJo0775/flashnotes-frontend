// tests/components/effects/BootGate.test.tsx

/**
 * LA PUERTA DEL ARRANQUE: se apaga, pide una tecla, y vuelve la corriente.
 *
 * ⚠ POR QUÉ EXISTE, QUE NO ES POR ESTÉTICA.
 *
 * Todo navegador crea el audio en estado suspendido y NO lo deja arrancar hasta
 * que hay un gesto del usuario. Es una política contra la publicidad con sonido,
 * y no tiene vuelta: cualquier cosa que se programe antes queda muda. Por eso el
 * arranque —las barras, el logo, la comprobación— sonaba en silencio y se
 * reportó una y otra vez.
 *
 * La única salida honesta es que el producto PIDA el gesto. Y da la casualidad
 * de que las máquinas de esa época hacían exactamente eso, así que lo que
 * empezó siendo una limitación del navegador entra en la ficción sin forzarla.
 *
 * ⚠ EL APAGÓN VA DELANTE, y ahí hay una renuncia consciente. Recargar es apagar y
 * encender, y ése es el orden de los hechos. Pero ese apagón pasa ANTES del primer
 * gesto, así que se ve y no se oye — y no hay código que lo arregle.
 *
 * Se probó lo contrario, mover la imagen detrás de la tecla para que sonara, y era
 * peor: rompe el orden de los hechos, que es lo único que esta pantalla tiene que
 * contar. Un apagado mudo sigue leyéndose como un apagado; un apagado que ocurre
 * después de encender no se lee como nada.
 *
 * Lo que SÍ se puede es que la vuelta se oiga entera, y para eso está el tercer
 * acto: el tubo abriéndose, que es la misma figura del apagón al revés.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BootGate from '@/components/effects/BootGate';
import { BOOT_OFF_MS, BOOT_WAKE_MS } from '@/lib/system/boot';
import { SOUND_STORAGE_KEY } from '@/lib/system/audio/context';
import { forgetV02Cache } from '@/lib/system/v02';

beforeEach(() => {
    localStorage.clear();
});

/** El ciclo entero tras la tecla, con margen para una suite cargada. */
const TRAS_EL_CICLO = BOOT_OFF_MS + BOOT_WAKE_MS + 600;

describe('cuando hay sonido que desbloquear', () => {
    it('⚠ lo PRIMERO es el tubo cerrandose, y con la marca COMPARTIDA', () => {
        /*
         * Recargar es apagar y encender, y ese es el orden de los hechos.
         *
         * `.collapse-dying` ya la pintan el arranque, el colapso y el barrido:
         * las tres cierran la imagen a un punto. La tabla de `screens.ts` la
         * reconoce, asi que este componente suena sin saber nada de sonido — y
         * si alguien le pusiera una clase propia «porque es otra pantalla», se
         * quedaria muda sin que nada fallara.
         */
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.collapse-dying')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('y cuando el tubo termina de cerrarse, pide la tecla', async () => {
        render(<BootGate onReady={() => {}} />);

        await waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument(), {
            timeout: BOOT_OFF_MS + 500,
        });
    });

    it('⚠ y al pulsar vuelve la corriente: el tubo se ABRE', async () => {
        /*
         * Es el inverso exacto del apagon —punto, linea, imagen— y existe para
         * que el encendido tenga por fin algo que mirar mientras suena. Anduvo
         * en las barras, donde se pisaba con el tono de la carta, y despues al
         * final de la comprobacion, que sonaba bien pero a ciegas.
         */
        render(<BootGate onReady={() => {}} />);

        await waitFor(() => screen.getByRole('button'), { timeout: BOOT_OFF_MS + 500 });
        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() => expect(document.querySelector('.tube-on')).toBeInTheDocument());
    });

    it('⚠ y ese tramo dura, para que el encendido no caiga sobre las barras', async () => {
        /*
         * Se pidio oir el grave —«ese grave me gusta, que suene al entrar»— y a
         * la vez que no se solapara con las barras de colores. Sin este hueco el
         * encendido y el zumbido solo podian entrar encima de ellas, porque el
         * navegador no deja sonar hasta el primer gesto y a partir de ahi todo
         * pasa a la vez.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: BOOT_OFF_MS + 500 });
        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() => expect(document.querySelector('.tube-on')).toBeInTheDocument());

        expect(abierta).not.toHaveBeenCalled();
    });

    it('⚠ y despues el arranque sigue DESDE LAS BARRAS', async () => {
        /*
         * Si siguiera desde el apagon, la maquina se apagaria otra vez justo
         * despues de que la encendieras — el apagon ya lo enseño esta pantalla.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: BOOT_OFF_MS + 500 });
        fireEvent.keyDown(document, { key: 'a' });

        await waitFor(() => expect(abierta).toHaveBeenCalledWith('bars'), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('y un clic tambien, porque no todo el mundo llega por teclado', async () => {
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: BOOT_OFF_MS + 500 });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('⚠ pero solo avisa UNA vez, aunque se aporree', async () => {
        /*
         * Quien encuentra una pantalla que dice «pulse una tecla» pulsa varias.
         * Si cada una avisara, el arranque se relanzaria encima de si mismo y
         * sonaria en capas.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        await waitFor(() => screen.getByRole('button'), { timeout: BOOT_OFF_MS + 500 });

        fireEvent.keyDown(document, { key: 'a' });
        fireEvent.keyDown(document, { key: 'b' });
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(abierta).toHaveBeenCalledTimes(1), {
            timeout: TRAS_EL_CICLO,
        });
    });

    it('⚠ adelantarse durante el apagon no lo corta, y tampoco se pierde', async () => {
        /*
         * Las dos mitades importan. Cortar el apagon dejaria a medias justo lo
         * que hay que ver; ignorar la tecla obligaria a pulsar dos veces sin
         * decir por que. Se apunta el gesto y se abre al terminar.
         */
        const abierta = jest.fn();
        render(<BootGate onReady={abierta} />);

        fireEvent.keyDown(document, { key: 'a' });

        // Todavia no: el tubo sigue cerrandose.
        expect(abierta).not.toHaveBeenCalled();
        expect(document.querySelector('.collapse-dying')).toBeInTheDocument();

        await waitFor(() => expect(abierta).toHaveBeenCalledWith('bars'), {
            timeout: TRAS_EL_CICLO,
        });

        // Y sin pasar por la pantalla de la tecla: ya la pulsaste.
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('tapa lo que haya debajo: es lo primero que se ve', () => {
        render(<BootGate onReady={() => {}} />);

        expect(document.querySelector('.boot-screen')).toBeInTheDocument();
    });

    it('⚠ y apaga el barrido, porque un tubo apagado no refresca', () => {
        /*
         * El barrido es el refresco del tubo. Dejar la linea cruzando mientras
         * la imagen se cierra a un punto contaria que la pantalla sigue
         * encendida justo cuando se esta apagando.
         */
        render(<BootGate onReady={() => {}} />);

        expect(document.documentElement).toHaveAttribute('data-tube-off');
    });
});

describe('⚠ con el sonido apagado no estorba', () => {
    it('no se enseña, y deja pasar de inmediato', () => {
        /*
         * La puerta existe SÓLO para desbloquear el audio. Sin audio que
         * desbloquear no pinta nada, y dejarla puesta sería un paso de más entre
         * alguien y sus notas — que es exactamente lo que la regla A2 prohíbe.
         */
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');
        const abierta = jest.fn();

        render(<BootGate onReady={abierta} />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(abierta).toHaveBeenCalledTimes(1);
    });

    it('⚠ y el arranque hace su PROPIO apagón, para que se vea igual', () => {
        /*
         * Sin puerta no hay quien enseñe el tubo cerrándose, así que el guion
         * tiene que empezar desde ahí. Si arrancara en las barras, apagar el
         * sonido cambiaría también lo que se VE al recargar, y no es eso lo que
         * el interruptor promete.
         */
        localStorage.setItem(SOUND_STORAGE_KEY, 'off');
        const abierta = jest.fn();

        render(<BootGate onReady={abierta} />);

        expect(abierta).toHaveBeenCalledWith('off');
    });
});

describe('⚠ y en la v0.2 nadie firma la puerta', () => {
    /*
     * Salió mirando la puerta con esa versión puesta: pedía una tecla con
     * «FLASHNOTES SYSTEMS INC.» debajo, cuando la broma entera de la v0.2 es que
     * nadie la firmó — su arranque no enseña el rótulo justamente por eso.
     *
     * Una puerta que lo enseña y un arranque que no son dos máquinas distintas
     * discutiendo, que es la misma incoherencia que tenía el botón de reinicio.
     */
    /** La puerta se pide DESPUÉS del apagón: hay que esperar a la tecla. */
    const alPedirLaTecla = () =>
        waitFor(() => expect(screen.getByRole('button')).toBeInTheDocument(), {
            timeout: BOOT_OFF_MS + 500,
        });

    it('la 1.0 sí lo lleva', async () => {
        localStorage.clear();
        forgetV02Cache();

        render(<BootGate onReady={() => {}} />);
        await alPedirLaTecla();

        expect(document.querySelector('.boot-vendor')).not.toBeNull();
    });

    it('y la v0.2 no', async () => {
        localStorage.clear();
        localStorage.setItem('flashnotes:v02', 'on');
        forgetV02Cache();

        render(<BootGate onReady={() => {}} />);
        await alPedirLaTecla();

        // La tecla sigue pidiéndose: lo que falta es la firma, no la puerta.
        expect(screen.getByRole('button')).toBeInTheDocument();
        expect(document.querySelector('.boot-vendor')).toBeNull();
    });
});
