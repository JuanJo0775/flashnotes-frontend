// tests/lib/system/audio/cierre.test.ts

/**
 * LO QUE CIERRA EL HUECO DE SONIDO: lo que vuelve, lo que se completa, y el
 * cuarto de la otra versión.
 *
 * Son los tres últimos de la auditoría §2.2. Los dos primeros comparten una
 * idea que vale la pena tener escrita en un sitio: **no hizo falta ninguna voz
 * nueva.** El cajón ya existía y ya decía lo que hacía falta; el silencio
 * también. Un catálogo de sonidos crece cuando alguien necesita decir algo que
 * no se puede decir con lo que hay — y no era el caso.
 */

import { startSound } from '@/lib/system/audio/wire';
import { teardownAudio } from '@/lib/system/audio/context';
import { startAmbience, stopAmbience } from '@/lib/system/audio/ambience';
import { markNoteRestored } from '@/hooks/useSystemState';
import { awardPiece, ART, clearFound } from '@/lib/system/asciiArt';
import { enterV02, forgetV02Cache } from '@/lib/system/v02';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;
let parar: () => void;

beforeEach(() => {
    localStorage.clear();
    clearFound();
    forgetV02Cache();
    quitarFalso = installFakeAudio();
    parar = startSound();
});

afterEach(() => {
    parar();
    teardownAudio();
    quitarFalso();
    forgetV02Cache();
    document.body.replaceChildren();
});

const unTic = (ms = 90) => new Promise((r) => setTimeout(r, ms));
const marca = () => lastContext()?.created.length ?? 0;
const nuevos = (desde: number): FakeNode[] => (lastContext()?.created ?? []).slice(desde);

/** Deja el ambiente ya encendido: seis osciladores no se cuelan en la cuenta. */
function conLaSalaYaEncendida() {
    const area = document.createElement('textarea');
    document.body.append(area);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    area.remove();
}

describe('lo que vuelve de la papelera', () => {
    it('⚠ suena, y es el cajón abriéndose', async () => {
        /*
         * El mismo cajón de la pieza ganada, y por eso no hace falta una voz
         * nueva: se abre cuando algo vuelve a tus manos y se cierra cuando algo
         * se va para siempre. La madera —ruido filtrado— es lo que lo separa del
         * impacto del cesto.
         */
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        markNoteRestored();
        await unTic();

        const nuevas = nuevos(antes);
        expect(nuevas.filter((n) => n.kind === 'bufferSource').length).toBeGreaterThan(0);
        expect(nuevas.filter((n) => n.kind === 'oscillator').length).toBeGreaterThan(0);
    });

    it('y el tope llega ANTES del final: se abre, no se cierra', async () => {
        /*
         * Cerrando, el tope suena al 98 % del recorrido porque hay un marco
         * esperando; abriendo, al 72 %, porque el cajón se frena solo. Es lo
         * único que distingue los dos gestos, así que es lo que hay que medir.
         */
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        markNoteRestored();
        await unTic();

        const nuevas = nuevos(antes);
        const madera = nuevas.find((n) => n.kind === 'bufferSource')!;
        const tope = nuevas.find((n) => n.kind === 'oscillator')!;
        const recorrido = madera.stopped! - madera.started!;

        expect((tope.started! - madera.started!) / recorrido).toBeLessThan(0.85);
    });
});

describe('⚠ la colección completa', () => {
    /** Gana todas menos la última, sin celebrar nada. */
    const casiTodas = () => {
        for (const pieza of ART.slice(0, -1)) awardPiece(pieza.id);
    };

    /**
     * Enciende la sala y devuelve SU salida.
     *
     * ⚠ HAY QUE APUNTAR A ESE NODO Y NO A «cualquier ganancia que pase por
     * cero», que es como estaba escrito y daba verde por el motivo equivocado:
     * las envolventes de los golpes también pasan por ahí. El silencio vive en
     * la salida del ambiente, y sólo ahí significa que el cuarto se cayó.
     */
    const salaEncendida = (): FakeNode => {
        /*
         * ⚠ SE APAGA PRIMERO, y sin esto el ayudante devolvía `undefined`:
         * `startAmbience` es idempotente —no vuelve a montar nada si ya está
         * sonando— y el suscriptor la enciende solo en cuanto detecta actividad.
         * O sea que el nodo que se buscaba no se había creado en esa llamada,
         * porque esa llamada no creó nada.
         */
        stopAmbience();

        const antes = lastContext()?.created.length ?? 0;
        startAmbience(() => 0.5, 0);

        const salida = nuevos(antes).find((n) => n.kind === 'gain');
        if (!salida) throw new Error('la sala no se encendió');

        return salida;
    };

    /** ¿Le programaron una bajada a CERO EXACTO? */
    const seCayo = (salida: FakeNode) => salida.gain.calls.some((c) => c.value === 0);

    it('el cuarto SE CAE al poner la última', async () => {
        /*
         * Era el único logro largo del juego sin un solo sonido: dieciséis
         * piezas por dieciséis caminos, y al poner la última el contador decía
         * 16/16 y ya.
         *
         * Lo que se celebra con lo más caro que tiene esta app y lo que menos se
         * usa: la sala callándose. Se mide en la ganancia de la salida del
         * ambiente, que es donde vive el silencio.
         */
        const salida = salaEncendida();
        await unTic();

        casiTodas();
        await unTic(400);
        expect(seCayo(salida)).toBe(false);

        awardPiece(ART[ART.length - 1].id);
        await unTic(500);

        // Cero y no «casi cero»: un fondo a −60 dB sigue estando ahí y el oído
        // lo nota; lo que tiene que notar es que no hay NADA.
        expect(seCayo(salida)).toBe(true);
        stopAmbience();
    });

    it('y las anteriores NO lo tiran: sólo la última', async () => {
        // Si cada pieza callara el cuarto, la colección sería dieciséis sustos
        // y el último no significaría nada.
        const salida = salaEncendida();
        await unTic();

        awardPiece(ART[0].id);
        await unTic(500);

        expect(seCayo(salida)).toBe(false);
        stopAmbience();
    });
});

describe('⚠ el cuarto de la v0.2 no es el mismo cuarto', () => {
    /** El nivel del aire de la caja, que es lo que más cambia. */
    const nivelDelAire = (): number => {
        const nodos = lastContext()!.created;
        // El aire es el único ruido en bucle del ambiente.
        const i = nodos.findIndex((n) => n.kind === 'bufferSource' && n.loop);
        // Su ganancia es el siguiente nodo de ganancia que se crea después.
        return nodos.slice(i).find((n) => n.kind === 'gain')!.gain!.value;
    };

    it('tiene menos caja: el aire pesa menos', () => {
        /*
         * El siseo del chasis es lo que hace que el zumbido suene DENTRO de
         * algo. Bajándolo, la máquina se queda sin mueble: se oye el motor.
         *
         * ⚠ Y NO ES «MÁS FUERTE». Subir la salida subiría también el aire y no
         * habría diferencia: habría más de lo mismo. Lo que cambia es el
         * reparto, igual que en la inversión del §26.
         */
        startAmbience(() => 0.5, 0);
        const sana = nivelDelAire();
        stopAmbience();
        teardownAudio();

        enterV02('NIDO');
        startAmbience(() => 0.5, 0);
        const vieja = nivelDelAire();

        expect(vieja).toBeLessThan(sana);
        stopAmbience();
    });
});
