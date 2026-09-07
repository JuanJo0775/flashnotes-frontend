// tests/lib/system/audio/context.test.ts

/**
 * EL ÚNICO `AudioContext`, Y EL PARLANTE POR EL QUE SALE TODO.
 *
 * Dos cosas se comprueban acá y las dos son estructurales, o sea que sólo se
 * ven mirando el grafo:
 *
 *  1 · APAGADO NO CREA NI UN NODO. No es volumen cero: es que no llega a
 *      existir un contexto. Un `AudioContext` abierto mantiene despierto el
 *      subsistema de audio del sistema operativo y en un portátil eso se paga
 *      en bateria, aunque no suene nada.
 *  2 · EL BUS LLEVA LA SALA Y EL PARLANTE, EN ORDEN. Es lo que hace que
 *      cualquier voz que se enchufe salga ya de época sin que la voz tenga que
 *      saber nada. Si alguien reordena la cadena, todo el sistema cambia de
 *      color de golpe y sin aviso.
 */

import { BAND_HIGH_HZ, BAND_LOW_HZ } from '@/lib/system/audio/speaker';
import { key } from '@/lib/system/audio/voices';
import {
    SOUND_STORAGE_KEY,
    ensureAudio,
    isSoundOn,
    setSoundOn,
    teardownAudio,
} from '@/lib/system/audio/context';
import {
    contextCount,
    installFakeAudio,
    lastContext,
    reaches,
    reachesNode,
} from './fakeAudio';

let quitarFalso: () => void;

// ⚠ `matchMedia` se guarda y se repone: el caso de `prefers-reduced-motion` lo
// reemplaza, y sin reponerlo el sonido queda apagado para todo lo que viene
// detrás — que es un test verde por el motivo equivocado y ocho rojos por un
// fallo que no existe.
const matchMediaOriginal = window.matchMedia;

beforeEach(() => {
    localStorage.clear();
    window.matchMedia = matchMediaOriginal;
    quitarFalso = installFakeAudio();
});

afterEach(() => {
    teardownAudio();
    quitarFalso();
    window.matchMedia = matchMediaOriginal;
});

describe('el interruptor', () => {
    it('viene encendido, igual que los efectos', () => {
        // El paralelo con `flashnotes:effects` es deliberado: se apagan igual,
        // se recuerdan igual, y quien sepa apagar uno sabe apagar el otro.
        expect(isSoundOn()).toBe(true);
    });

    it('se recuerda apagado', () => {
        setSoundOn(false);

        expect(localStorage.getItem(SOUND_STORAGE_KEY)).toBe('off');
        expect(isSoundOn()).toBe(false);
    });

    it('y quien pide menos movimiento no está pidiendo más ruido', () => {
        window.matchMedia = ((q: string) => ({
            matches: q.includes('prefers-reduced-motion'),
            media: q,
            addEventListener: () => {},
            removeEventListener: () => {},
        })) as unknown as typeof window.matchMedia;

        expect(isSoundOn()).toBe(false);
    });
});

describe('⚠ apagado no crea ni un nodo', () => {
    it('ni siquiera llega a construir el contexto', () => {
        setSoundOn(false);

        expect(ensureAudio()).toBeNull();
        expect(contextCount()).toBe(0);
    });

    it('y apagarlo en caliente cierra el que hubiera', () => {
        const grafo = ensureAudio();
        expect(grafo).not.toBeNull();

        setSoundOn(false);

        expect(lastContext()!.state).toBe('closed');
        expect(ensureAudio()).toBeNull();
    });
});

describe('el contexto', () => {
    it('es UNO solo, se pida las veces que se pida', () => {
        // Cada contexto extra es un subsistema de audio despierto de mas. Los
        // navegadores ademas limitan cuantos se pueden tener abiertos.
        const a = ensureAudio();
        const b = ensureAudio();

        expect(a).toBe(b);
        expect(contextCount()).toBe(1);
    });

    it('nace suspendido y se le pide que arranque', () => {
        // Chrome, Safari y Firefox crean todo contexto suspendido hasta que hay
        // un gesto. Pedir `resume()` es lo unico que se puede hacer, y es lo
        // que enciende el parlante en el primer clic.
        ensureAudio();

        expect(lastContext()!.state).toBe('running');
    });
});

describe('⚠ y si nace dormido, se le vuelve a pedir que despierte', () => {
    it('cada llamada reintenta el arranque, no solo la primera', () => {
        /*
         * EL FALLO QUE ESTO CIERRA, Y ES DE LOS QUE DEJAN TODO MUDO SIN AVISAR.
         *
         * El contexto se crea la primera vez que alguien pide sonar, y ahi se le
         * pide `resume()`. Pero si esa primera vez NO viene de un gesto de
         * usuario —y puede pasar: la app pone atributos en el documento al
         * arrancar, y el sonido los escucha— el navegador lo deja suspendido y
         * la llamada no sirve de nada.
         *
         * A partir de ahi `ensureAudio` devolvia el grafo cacheado sin volver a
         * intentarlo NUNCA, asi que ningun clic posterior lo despertaba: la app
         * quedaba muda para el resto de la sesion y sin un solo error.
         *
         * Reintentar es gratis —si ya esta corriendo no hace nada— y convierte
         * un fallo permanente en, como mucho, un sonido perdido.
         */
        ensureAudio();

        const ctx = lastContext()!;
        ctx.state = 'suspended';

        ensureAudio();

        expect(ctx.state).toBe('running');
    });
});

describe('el bus maestro es el parlante', () => {
    it('mete la sala con una IR de dos canales generada por codigo', () => {
        ensureAudio();

        const convolver = lastContext()!.first('convolver');

        expect(convolver).toBeDefined();
        expect(convolver!.buffer!.numberOfChannels).toBe(2);
        expect(convolver!.buffer!.length).toBeGreaterThan(0);
    });

    it('recorta por abajo y por arriba, que es lo que hace el cono', () => {
        ensureAudio();

        const filtros = lastContext()!.created.filter((n) => n.kind === 'biquad');
        const agudos = filtros.find((f) => f.type === 'highpass');
        const graves = filtros.find((f) => f.type === 'lowpass');

        expect(agudos!.frequency.value).toBe(BAND_LOW_HZ);
        expect(graves!.frequency.value).toBe(BAND_HIGH_HZ);
    });

    it('satura con la curva del altavoz', () => {
        ensureAudio();

        const shaper = lastContext()!.first('shaper');

        expect(shaper!.curve).toBeInstanceOf(Float32Array);
        expect(shaper!.curve!.length).toBeGreaterThan(1);
    });

    it('y lleva limitador, para que dos cosas a la vez no recorten', () => {
        ensureAudio();

        expect(lastContext()!.first('compressor')).toBeDefined();
    });

    it('⚠ lo que se enchufe al bus sale por el parlante y llega al destino', () => {
        /*
         * Ésta es la afirmación que sostiene todo el diseño: una voz no sabe
         * nada de salas ni de altavoces, sólo se enchufa al bus. Si alguien
         * reordena la cadena y deja el shaper colgando, cada voz futura sonaría
         * limpia y nadie sabría por qué.
         */
        const grafo = ensureAudio()!;

        expect(reaches(grafo.speaker, 'shaper')).toBe(true);
        expect(reaches(grafo.speaker, 'compressor')).toBe(true);
        expect(reaches(grafo.speaker, 'destination')).toBe(true);
    });

    it('la sala es un envío, no está en el camino directo', () => {
        /*
         * ⚠ SI EL CONVOLVER ESTUVIERA EN SERIE, TODO SONARÍA LEJOS.
         *
         * Un sonido real es directo MÁS cuarto, no cuarto solo. Con la sala en
         * serie la tecla perdería su golpe y sonaría como si la tocaran en la
         * habitación de al lado.
         */
        const grafo = ensureAudio()!;

        expect(reaches(grafo.room, 'convolver')).toBe(true);
    });
});

describe('⚠ los dos caminos, que es la distincion del §1', () => {
    /*
     * ES EL ERROR DE DISENO MAS CARO QUE TIENE ESTE TRABAJO POR DELANTE, y lo
     * dice el propio plan. Hay dos clases de sonido y no pueden compartir
     * cadena:
     *
     *  · LO QUE LA MAQUINA EMITE por su bocinita —el bip, el error— tiene que
     *    sonar BARATO. Cono de cinco centimetros, de 200 Hz a 6 kHz, saturado.
     *    Ahi lo pobre es la intencion.
     *  · LO QUE LA MAQUINA Y LA SALA HACEN —la tecla, el rele, el cabezal, el
     *    chasis— son objetos fisicos en una habitacion. No salen por ningun
     *    altavoz: los oye tu oreja, en el cuarto.
     *
     * Meter la tecla por el pasabanda de la bocinita le arranca justo el cuerpo
     * de 100 a 400 Hz, que es TODO lo que separa un teclado mecanico de uno de
     * membrana. Es la diferencia entre un sonido rico y uno maluco, y se
     * pierde en una linea de codigo.
     */

    it('lo fisico NO pasa por el pasabanda de la bocinita', () => {
        const grafo = ensureAudio()!;
        const filtros = lastContext()!.created.filter((n) => n.kind === 'biquad');
        const recorteDeGraves = filtros.find(
            (f) => f.type === 'highpass' && f.frequency.value === BAND_LOW_HZ
        )!;

        // El camino de aire llega a la salida SIN cruzar ese recorte.
        expect(reaches(grafo.air, 'destination')).toBe(true);
        expect(reachesNode(grafo.air, recorteDeGraves)).toBe(false);

        // Y el de la bocinita si lo cruza, que es lo que la hace sonar barata.
        expect(reachesNode(grafo.speaker, recorteDeGraves)).toBe(true);
    });

    it('pero los dos comparten la MISMA sala', () => {
        /*
         * Es lo que los mantiene en el mismo sitio. Si cada camino tuviera su
         * cuarto, el bip y la tecla sonarian en dos habitaciones distintas y el
         * oido lo nota enseguida: se rompe la ilusion de que hay UNA maquina.
         */
        const grafo = ensureAudio()!;

        expect(reaches(grafo.speaker, 'convolver') || reaches(grafo.room, 'convolver')).toBe(true);
        expect(lastContext()!.count('convolver')).toBe(1);
    });

    it('y los dos acaban en el mismo limitador', () => {
        // Un solo techo para todo. Con dos limitadores, dos sonidos a la vez se
        // pasan del techo real y el navegador recorta con ruido feo.
        const grafo = ensureAudio()!;

        expect(reaches(grafo.speaker, 'compressor')).toBe(true);
        expect(reaches(grafo.air, 'compressor')).toBe(true);
        expect(lastContext()!.count('compressor')).toBe(1);
    });
});

describe('el ruido cacheado y el ciclo de vida del contexto', () => {
    it('un contexto nuevo genera SU ruido, no hereda el del muerto', () => {
        /*
         * ⚠ UN BUFER DE UN CONTEXTO CERRADO NO SE PUEDE USAR: en un navegador
         * de verdad, pasarselo a una fuente del contexto nuevo tira error. Y el
         * ruido se cachea a proposito, porque generarlo en cada tecla seria la
         * forma mas rapida de que el sonido pese — o sea que el riesgo de
         * cachearlo DE MAS es real.
         *
         * ⚠ HONESTIDAD SOBRE ESTE TEST: paso en verde a la primera. No dirigio
         * el diseno, lo caracteriza. Se queda igual porque el fallo que vigila
         * —cachear por «el primer contexto» en vez de «este contexto»— es una
         * simplificacion que cualquiera haria y que rompe al apagar y volver a
         * encender el sonido, que es justo lo que nadie prueba a mano.
         */
        const primero = ensureAudio()!;
        key(primero, Math.random);

        const buffersDelPrimero = lastContext()!.buffersCreated;
        expect(buffersDelPrimero).toBeGreaterThanOrEqual(2); // la sala y el ruido

        teardownAudio();

        const segundo = ensureAudio()!;
        const soloLaSala = lastContext()!.buffersCreated;
        key(segundo, Math.random);

        expect(lastContext()!.buffersCreated).toBe(soloLaSala + 1);
    });
});
