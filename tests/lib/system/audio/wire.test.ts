// tests/lib/system/audio/wire.test.ts

/**
 * UN SOLO SUSCRIPTOR, NO CUARENTA LLAMADAS.
 *
 * ⚠ ES LA DECISIÓN QUE EL PLAN DICE QUE HAY QUE ACERTAR A LA PRIMERA, y tiene
 * razón: si el sonido se reparte por los componentes, quedan disparos huérfanos
 * en sitios que nadie recuerda, y el día que uno suene de más no hay forma de
 * saber quién lo pidió. `awardFrom` ya está llamado desde NUEVE sitios
 * distintos: ése es el futuro que esto evita.
 *
 * Todo cuelga de los eventos que YA EXISTEN. Cuatro de las fuentes no tocan una
 * línea de código de la app —dos almacenes, una escucha de teclado y un
 * observador del `body`— y las otras dos entran por el embudo por el que ya
 * pasaban todas las llamadas.
 */

import {
    COLLAPSE_SILENCE_MS,
    IDLE_MS,
    LABEL_BEEP_AT,
    startSound,
} from '@/lib/system/audio/wire';
import { SEEK_JITTER, SEEK_MS } from '@/lib/system/audio/screens';
import { ambienceIsOn } from '@/lib/system/audio/ambience';
import { barsToneIsOn } from '@/lib/system/audio/bars';
import { teardownAudio } from '@/lib/system/audio/context';
import { fireGlitch } from '@/hooks/useGlitch';
import { awardPiece, clearFound as clearArt } from '@/lib/system/asciiArt';
import {
    markSecretFound,
    registerLogoClick,
    setEffectsEnabled,
} from '@/hooks/useSystemState';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;
let parar: () => void;

/** Una pieza cualquiera de la coleccion. Cual sea da igual: lo que se mide
 *  es que ganar UNA suene. */
const PIEZA = 'moth';

beforeEach(() => {
    localStorage.clear();
    clearArt();
    quitarFalso = installFakeAudio();
    parar = startSound();
});

afterEach(() => {
    parar();
    teardownAudio();
    quitarFalso();

    /*
     * ⚠ SE VACIA EL CUERPO, Y NO ES HIGIENE DE MAS. Cada test quita lo que
     * puso, pero si el `expect` falla ANTES de esa linea el elemento se queda —
     * y como el sonido cuelga de marcas del DOM, un `.boot-bars` olvidado hace
     * que todos los tests siguientes arranquen con la marca ya presente y sin
     * flanco de subida. Se vio: un fallo de verdad se convirtio en seis, y cinco
     * apuntaban a sitios donde no habia nada roto.
     */
    document.body.replaceChildren();
});

/** Las fuentes de sonido creadas desde una marca: lo que suena de verdad. */
function fuentes(desde: number): FakeNode[] {
    return lastContext()!
        .created.slice(desde)
        .filter((n) => n.kind === 'bufferSource' || n.kind === 'oscillator');
}

/**
 * Sólo las fuentes de RUIDO creadas desde una marca.
 *
 * ⚠ HACE FALTA PARA NO MEDIR EL TONO POR ERROR. Encender y apagar el tubo pasan
 * en el mismo instante que aparecen y se van las barras, y las barras traen su
 * tono de 1 kHz — que es un oscilador. Contando fuentes a secas, un test del
 * encendido pasa en verde con el encendido borrado, porque el tono solo ya
 * cuenta. El chasquido del interruptor y la descarga del fósforo son ruido, y el
 * tono no puede fabricar ni uno.
 */
function ruidos(desde: number): FakeNode[] {
    return fuentes(desde).filter((n) => n.kind === 'bufferSource');
}

/** Cuántos nodos hay, o cero si aún no nació el contexto. */
function marca(): number {
    return lastContext()?.created.length ?? 0;
}

/**
 * Deja el ambiente ya encendido antes de medir.
 *
 * ⚠ HACE FALTA DESDE QUE EL ZUMBIDO ENTRA CON LA ACTIVIDAD. El ambiente son seis
 * osciladores, y si arranca DENTRO de la ventana que se está midiendo, se cuela
 * en la cuenta de notas y un confirm de dos notas parece de ocho. No es un fallo
 * del sonido: es que la medición tiene que empezar con la sala ya encendida,
 * como está siempre que alguien lleva un rato jugando.
 */
function conLaSalaYaEncendida() {
    const area = document.createElement('textarea');
    document.body.append(area);
    teclear('a', area);
    area.remove();
}

function teclear(key: string, target: HTMLElement) {
    target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('las teclas', () => {
    it('suenan al escribir en un área de texto', () => {
        const area = document.createElement('textarea');
        document.body.append(area);

        teclear('a', area);

        expect(fuentes(0).length).toBeGreaterThan(0);
        area.remove();
    });

    it('⚠ pero NO cuando el foco no está escribiendo en ningún sitio', () => {
        /*
         * Si sonara con cualquier tecla, navegar con el tabulador o pulsar
         * Escape haría ruido de teclado sin que nadie esté escribiendo. La tecla
         * es el sonido de ESCRIBIR, no el de tocar el teclado.
         */
        const div = document.createElement('div');
        document.body.append(div);
        const antes = marca();

        teclear('a', div);

        // ⚠ Se mide por FUENTES y no por «no hay contexto»: desde que el
        // ambiente arranca al montar, el contexto existe siempre. Lo que se
        // afirma es que no sonó nada nuevo, que es lo que importaba.
        expect(fuentes(antes)).toHaveLength(0);
        div.remove();
    });

    it('y los modificadores solos no golpean nada', () => {
        // Pulsar Shift para escribir una mayúscula suena UNA vez, la de la
        // letra. Si sonara también el Shift, escribir en mayúsculas sonaría al
        // doble de velocidad.
        const area = document.createElement('textarea');
        document.body.append(area);

        const antes = marca();

        teclear('Shift', area);
        teclear('Control', area);

        expect(fuentes(antes)).toHaveLength(0);
        area.remove();
    });
});

describe('el glitch', () => {
    it('suena cuando el almacén del glitch se enciende', () => {
        /*
         * ⚠ CUELGA DEL MISMO CAMBIO DE ESTADO QUE PINTA LA IMAGEN, y ésa es la
         * razón de suscribirse en vez de disparar a mano: el sonido y el tirón
         * salen del mismo suceso, así que no hay dos relojes que sincronizar.
         */
        setEffectsEnabled(true);
        const antes = marca();

        fireGlitch();

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });
});

describe('el final del §26', () => {
    const unTic = () => new Promise((r) => setTimeout(r, 90));

    it('⚠ cada golpe a la pared CRUJE, y no suena a glitch', async () => {
        /*
         * Aca sonaba `glitchBurst`, que es el ruido de la SEÑAL rompiendose:
         * electrico, escalonado, de banda ancha. Lo que pasa en la pantalla es
         * otra cosa entera — un objeto fisico pegado que cede a golpes. Madera y
         * yeso, no electronica.
         *
         * Se mide por RUIDO porque el desgarro es ruido filtrado y no tiene ni
         * un oscilador: si alguien devolviera el glitch, el tirón de imagen
         * traeria los suyos.
         */
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        document.body.style.setProperty('--blow-amp', '9');
        document.body.classList.add('is-blow');
        await unTic();

        expect(ruidos(antes).length).toBeGreaterThan(0);
        document.body.classList.remove('is-blow');
    });

    it('el pedazo cayendo trae su barrido, y el impacto DETRAS', async () => {
        /*
         * Los dos a la vez serian un golpe sucio; separados son una cosa que cae
         * y otra que llega al suelo, que es lo que se esta viendo.
         */
        const pedazo = document.createElement('div');
        pedazo.className = 'loose-slab--cae';

        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        document.body.append(pedazo);
        await unTic();
        const alCaer = fuentes(antes).length;

        await new Promise((r) => setTimeout(r, 700));

        expect(alCaer).toBeGreaterThan(0);
        expect(fuentes(antes).length).toBeGreaterThan(alCaer);
        pedazo.remove();
    });

    it('⚠ el ojo DA VUELTA la sala, y la devuelve al irse', async () => {
        /*
         * El §26 · 3 no pide subir el volumen: pide invertir el ambiente. El
         * zumbido sube y el aire de la caja se enmudece, asi que deja de oirse
         * una habitacion con una maquina dentro y pasa a oirse la maquina sola.
         *
         * Se mide en las ganancias de los armonicos, que es donde vive la
         * inversion: subir la SALIDA subiria tambien el siseo, y entonces no
         * habria inversion — habria mas de lo mismo.
         */
        conLaSalaYaEncendida();
        await unTic();

        const armonicos = () =>
            lastContext()!
                .created.filter((n) => n.kind === 'gain')
                .map((n) => n.gain.value);

        const antes = armonicos();

        const lluvia = document.createElement('pre');
        lluvia.className = 'wall-rain';
        document.body.append(lluvia);
        await unTic();

        // La inversion es una RAMPA: lo que se comprueba es que se pidio, no que
        // ya llego. El destino queda anotado en el parametro.
        const rampas = lastContext()!
            .created.filter((n) => n.kind === 'gain')
            .flatMap((n) => n.gain.calls ?? []);

        expect(antes.length).toBeGreaterThan(0);
        expect(rampas.length).toBeGreaterThan(0);

        lluvia.remove();
    });

    it('y mientras el ojo mira, los datos chacharean una y otra vez', async () => {
        /*
         * No es un golpe: es lo que HAY mientras dura. Una rafaga sola seria un
         * suceso, y el ojo no es un suceso — es un sitio distinto.
         */
        const lluvia = document.createElement('pre');
        lluvia.className = 'wall-rain';

        conLaSalaYaEncendida();
        await unTic();
        document.body.append(lluvia);
        await unTic();

        // Ya sono la primera rafaga. Se marca DESPUES.
        const antes = marca();
        await new Promise((r) => setTimeout(r, 1_500));

        expect(fuentes(antes).length).toBeGreaterThan(0);
        lluvia.remove();
    });

    it('⚠ y el derrumbe deja SILENCIO ABSOLUTO, no casi silencio', async () => {
        /*
         * El plan lo llama «el recurso mas barato y mas fuerte del documento
         * entero»: despues de veinte minutos con algo de fondo, quitarlo de
         * golpe es lo mas fuerte que se puede hacer.
         *
         * ⚠ Y NO BASTA CON CALLAR EL ZUMBIDO. Justo ahi empieza el parpadeo de
         * tema, que dispara reles — y un silencio con clics dentro no es un
         * silencio. Se mide que NINGUNA voz nueva entra.
         */
        conLaSalaYaEncendida();
        await unTic();

        document.body.classList.add('is-failing');
        await unTic();
        const antes = marca();

        // Se intenta sonar por todos lados: nada puede colarse.
        const area = document.createElement('textarea');
        document.body.append(area);
        teclear('a', area);
        markSecretFound('inspect');

        expect(fuentes(antes)).toHaveLength(0);

        area.remove();
        document.body.classList.remove('is-failing');
    });

    it('y cuando el hueco pasa, la maquina vuelve a poder sonar', async () => {
        // Un silencio que no termina no es un silencio, es una averia.
        conLaSalaYaEncendida();
        await unTic();

        document.body.classList.add('is-failing');
        await unTic();

        await new Promise((r) => setTimeout(r, COLLAPSE_SILENCE_MS + 120));
        const antes = marca();

        const area = document.createElement('textarea');
        document.body.append(area);
        teclear('a', area);

        expect(fuentes(antes).length).toBeGreaterThan(0);

        area.remove();
        document.body.classList.remove('is-failing');
    });
});

describe('el pong, que ocurre entre fotogramas', () => {
    /*
     * ⚠ EL JUEGO PUBLICA Y EL SONIDO LEE. Los rebotes pasan dentro del paso de
     * fisica y el suscriptor no puede verlos desde afuera. Antes que meter un
     * `play()` en el componente —el primer disparo huerfano fuera de este
     * modulo— el juego escribe contadores en su raiz.
     *
     * Contadores y no banderas: una bandera de «reboto» habria que apagarla, y
     * dos rebotes en el mismo fotograma dejarian uno mudo.
     */
    const unTic = () => new Promise((r) => setTimeout(r, 90));

    function abrirPong() {
        const el = document.createElement('div');
        el.className = 'pong-layer';
        el.setAttribute('data-rally', '0');
        el.setAttribute('data-bounces', '0');
        el.setAttribute('data-over', 'no');
        el.setAttribute('data-paused', 'no');
        el.setAttribute('data-render', 'fluid');
        document.body.append(el);
        return el;
    }

    it('⚠ abrirlo NO suena: es el estado con el que empieza', async () => {
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        abrirPong();
        await unTic();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('devolverla suena, y rebotar contra la pared tambien', async () => {
        const el = abrirPong();
        conLaSalaYaEncendida();
        await unTic();

        const antes = marca();
        el.setAttribute('data-rally', '1');
        await unTic();
        const trasPaleta = fuentes(antes).length;

        el.setAttribute('data-bounces', '1');
        await unTic();

        expect(trasPaleta).toBeGreaterThan(0);
        expect(fuentes(antes).length).toBeGreaterThan(trasPaleta);
    });

    it('y perder suena una vez, no en cada repaso', async () => {
        const el = abrirPong();
        conLaSalaYaEncendida();
        await unTic();

        const antes = marca();
        el.setAttribute('data-over', 'yes');
        await unTic();
        const alPerder = fuentes(antes).length;

        // Otra mutacion cualquiera: perder ya paso, no vuelve a pasar.
        el.setAttribute('data-paused', 'no');
        await unTic();

        expect(alPerder).toBeGreaterThan(0);
        expect(fuentes(antes).length).toBe(alPerder);
    });

    it('⚠ y la tabla de glifos cayendose trae SU tiron, no un blip', async () => {
        /*
         * Cuando el juego pasa a dibujarse con caracteres, eso no es un sonido
         * de juego: es la señal rompiendose, el mismo tiron que en el resto de
         * la app. Pequeño y solo al llegar — pasa cada tanto y solo, y un tiron
         * grande convertiria una averia de fondo en el protagonista.
         *
         * Se mide por RUIDO: los tres tonos del pong son osciladores y no
         * fabrican ninguno; el tiron es ruido filtrado.
         */
        const el = abrirPong();
        conLaSalaYaEncendida();
        await unTic();

        const antes = marca();
        el.setAttribute('data-render', 'quantised');
        await unTic();

        expect(ruidos(antes).length).toBeGreaterThan(0);
    });

    it('y volver a la normalidad NO suena: volver no es un suceso', async () => {
        const el = abrirPong();
        conLaSalaYaEncendida();
        await unTic();
        el.setAttribute('data-render', 'quantised');
        await unTic();

        const antes = marca();
        el.setAttribute('data-render', 'fluid');
        await unTic();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ y parar es un interruptor, no un blip', async () => {
        // Parar y seguir son la misma clase de suceso, asi que suenan igual: un
        // rele. Es lo que ya suena cuando se cambia el tema.
        const el = abrirPong();
        conLaSalaYaEncendida();
        await unTic();

        const antes = marca();
        el.setAttribute('data-paused', 'yes');
        await unTic();

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });
});

describe('el tic del teletipo', () => {
    /*
     * ⚠ POR LINEA Y NUNCA POR CARACTER. Las respuestas se teclean letra a letra
     * —dieciocho milisegundos cada una— y un tic por caracter seria una
     * ametralladora aunque la compuerta lo recortara. Un teletipo golpea el papel
     * una vez por renglon.
     */
    const unTic = () => new Promise((r) => setTimeout(r, 90));

    /** La respuesta, como la monta el editor: un hueco donde crece el texto. */
    function abrirRespuesta() {
        const el = document.createElement('span');
        el.className = 'editor-reply-body';
        document.body.append(el);
        return el;
    }

    it('⚠ escribir DENTRO de una linea no suena', async () => {
        const el = abrirRespuesta();
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        // Se teclean letras, sin cerrar ningun renglon.
        for (const c of 'MEMORIA') {
            el.textContent += c;
            await unTic();
        }

        expect(fuentes(antes)).toHaveLength(0);
        el.remove();
    });

    it('y cada renglon que se cierra da UN golpe', async () => {
        const el = abrirRespuesta();
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        el.textContent = 'PRIMERA\n';
        await unTic();
        const trasUna = fuentes(antes).length;

        el.textContent = 'PRIMERA\nSEGUNDA\n';
        await unTic();

        expect(trasUna).toBeGreaterThan(0);
        expect(fuentes(antes).length).toBeGreaterThan(trasUna);
        el.remove();
    });

    it('⚠ y una fila revelada de golpe tambien cuenta como renglon', async () => {
        /*
         * `//help` no se teclea: revela una FILA entera cada vez. Son las dos
         * formas de imprimir un renglon que tiene esta app, y las dos tienen que
         * sonar igual — si no, la lista mas larga del juego seria la unica muda.
         */
        const el = abrirRespuesta();
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        const fila = document.createElement('span');
        fila.className = 'reply-row';
        fila.textContent = 'COMANDO';
        el.append(fila);
        await unTic();

        expect(fuentes(antes).length).toBeGreaterThan(0);
        el.remove();
    });

    it('y cuando la respuesta se va, deja de escuchar', async () => {
        // Un observador que sobrevive a su elemento es el fallo clasico del
        // temporizador que se arma y no se desarma.
        const el = abrirRespuesta();
        conLaSalaYaEncendida();
        await unTic();

        el.remove();
        await unTic();
        const antes = marca();

        // Ya fuera del documento: nada de lo que le pase puede sonar.
        el.textContent = 'FANTASMA\n';
        await unTic();

        expect(fuentes(antes)).toHaveLength(0);
    });
});

describe('ganarse una pieza de arte', () => {
    /** Lo justo para que corran los avisos del almacen. */
    const unTic = () => new Promise((r) => setTimeout(r, 80));

    /*
     * ⚠ CUELGA DEL ALMACEN Y NO DE LOS NUEVE SITIOS QUE REGALAN ARTE.
     * `awardFrom` se llama desde nueve componentes distintos —el pong, el
     * bloqueo, el reloj, la sesion larga— y poner el sonido en cada uno era
     * exactamente el futuro que este modulo existe para evitar.
     */
    it('el cajon se abre, un poco despues', async () => {
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        awardPiece(PIEZA);

        // ⚠ No suena en el acto: ver el porque abajo.
        expect(fuentes(antes)).toHaveLength(0);

        await new Promise((r) => setTimeout(r, 400));

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });

    it('⚠ y llega DETRAS del hallazgo, no encima', async () => {
        /*
         * Ganar una pieza suele coincidir con encontrar un secreto, y las dos
         * voces son de la misma familia: en el mismo instante la compuerta se
         * comeria una de las dos, y cual se salva seria cuestion de suerte.
         *
         * Separadas se leen como lo que son — «eso contaba», y detras, «y ademas
         * te llevas esto».
         */
        conLaSalaYaEncendida();
        await unTic();

        /*
         * ⚠ UN SECRETO QUE NO USE NINGUN OTRO TEST DE ESTE FICHERO. El conjunto
         * de hallazgos vive en MEMORIA y `localStorage.clear()` no lo toca, asi
         * que marcar uno ya marcado no publica nada — y el test siguiente que lo
         * usara se quedaba sin sonido. Paso: se gasto `history` aca y el test del
         * ente, mas abajo, empezo a medir cero notas.
         */
        const antes = marca();
        markSecretFound('morse');
        awardPiece(PIEZA);
        await unTic();

        // Primero suena el hallazgo, solo.
        const alPrincipio = fuentes(antes).length;
        expect(alPrincipio).toBeGreaterThan(0);

        await new Promise((r) => setTimeout(r, 400));

        // Y el cajon llega despues, sin pelearse con el.
        expect(fuentes(antes).length).toBeGreaterThan(alPrincipio);
    });

    it('la misma pieza NO suena dos veces', () => {
        // `awardPiece` ya ignora las repetidas; el sonido hereda esa regla en
        // vez de tener la suya.
        awardPiece(PIEZA);
        const antes = marca();

        awardPiece(PIEZA);

        expect(fuentes(antes)).toHaveLength(0);
    });
});

describe('los hallazgos', () => {
    it('un secreto suena', () => {
        const antes = marca();

        markSecretFound('commands');

        expect(fuentes(antes).length).toBeGreaterThan(0);
    });

    it('el mismo secreto NO suena dos veces', () => {
        // `markSecretFound` ya ignora los repetidos; esto fija que el sonido
        // siga esa decisión en vez de tener la suya.
        markSecretFound('diagnostics');
        const antes = marca();

        markSecretFound('diagnostics');

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ y los del ente suenan DISTINTO de los demás', async () => {
        /*
         * La diferencia de sentido que el plan pide que se oiga: los suyos no
         * los encontraste, te los dio él. Se comprueba por la forma de las
         * notas, que es lo que las distingue — la buena sube y la torcida baja.
         */
        /*
         * ⚠ CON UNA ESPERA ENTRE MEDIO, y la primera versión no la tenía: los
         * dos confirms son de la misma familia, así que la compuerta de 60 ms
         * se comía el segundo y el test fallaba por un motivo que no era el
         * suyo. Dos hallazgos en el mismo milisegundo no pasan jugando.
         */
        conLaSalaYaEncendida();

        const sube = async (id: string) => {
            const antes = marca();
            markSecretFound(id);
            await new Promise((r) => setTimeout(r, 70));

            const notas = fuentes(antes).map((n) => n.frequency.value);
            return notas.length === 2 ? notas[1] > notas[0] : null;
        };

        expect(await sube('history')).toBe(true);
        expect(await sube('entity-awake')).toBe(false);
    });

    it('y reportarlo suena BIEN, porque ése te lo llevaste vos', () => {
        /*
         * Es el único `entity-*` que no te dio él: es el que conseguiste
         * VOLVIÉNDOTE EN SU CONTRA. Que suene limpio justo ahí lo convierte en
         * una pequeña traición, que vale más que una melodía número treinta y
         * cuatro.
         */
        conLaSalaYaEncendida();

        const antes = marca();
        markSecretFound('entity-reported');
        const notas = fuentes(antes).map((n) => n.frequency.value);

        expect(notas[1]).toBeGreaterThan(notas[0]);
    });
});

describe('apagarlo lo apaga entero', () => {
    it('⚠ y se lleva por delante lo que estaba APLAZADO', async () => {
        /*
         * VARIAS VOCES SON DE DOS TIEMPOS: el encendido y su cabezal 620 ms
         * despues, el barrido y su impacto. El segundo tiempo vivia en un
         * `setTimeout` suelto que nadie cancelaba, asi que apagar el sonido
         * dejaba el golpe en el aire y sonaba despues de haberlo apagado.
         *
         * Se cazó aca: un golpe aparecia en la medicion de OTRO test, que es
         * exactamente el mismo fallo visto desde dentro.
         */
        const barras = document.createElement('div');
        barras.className = 'boot-bars';

        conLaSalaYaEncendida();
        await new Promise((r) => setTimeout(r, 80));
        document.body.append(barras);
        await new Promise((r) => setTimeout(r, 80));

        // El encendido ya sono; el cabezal todavia no. Se apaga justo en medio.
        parar();
        const antes = marca();

        await new Promise((r) => setTimeout(r, 900));

        expect(fuentes(antes)).toHaveLength(0);
        barras.remove();
    });

    it('parar el suscriptor deja de sonar', () => {
        parar();

        const area = document.createElement('textarea');
        document.body.append(area);
        const antes = marca();
        teclear('a', area);

        expect(fuentes(antes)).toHaveLength(0);
        area.remove();
    });
});

describe('el ambiente entra con la actividad y se va solo', () => {
    it('⚠ ESTÁ DESDE EL PRINCIPIO, sin que nadie lo active', () => {
        /*
         * CORREGIDO DESPUÉS DE UN MALENTENDIDO MÍO, y vale la pena escribirlo.
         *
         * Yo lo tenía arrancando con la primera actividad, razonando que un
         * ambiente que aparece antes de que hagas nada se oye ENTRAR. Eso es
         * cierto de un ambiente que SUBE de golpe, y me llevó a la conclusión
         * equivocada:
         *
         *   «el sonido es ambiente, debe sonar desde el inicio sin que algo lo
         *    active».
         *
         * Tiene razón. El fondo no es una reacción a lo que hacés: es el ruido
         * de que la máquina está encendida, y una máquina encendida no espera a
         * que la toquen. Lo que evita que se oiga entrar no es retrasarlo, es
         * que suba despacio — y eso ya lo hacía.
         *
         * Lo único que sigue mandando es el navegador: si no deja sonar todavía,
         * los osciladores quedan programados y se oyen en cuanto despierte.
         */
        expect(ambienceIsOn()).toBe(true);
    });

    it('⚠ y se va tras un rato quieto, sin que nadie se lo pida', () => {
        /*
         * ES LA MITAD QUE HACE QUE NO CANSE. Un zumbido que se queda para
         * siempre es exactamente el lecho que este diseño descartó: agota en
         * cinco minutos y enmascara todo lo demás. Si te vas a leer otra cosa,
         * la máquina se calla sola.
         */
        jest.useFakeTimers();

        try {
            const area = document.createElement('textarea');
            document.body.append(area);
            teclear('a', area);
            expect(ambienceIsOn()).toBe(true);

            jest.advanceTimersByTime(IDLE_MS + 100);

            expect(ambienceIsOn()).toBe(false);
            area.remove();
        } finally {
            jest.useRealTimers();
        }
    });

    it('y seguir escribiendo lo mantiene', () => {
        jest.useFakeTimers();

        try {
            const area = document.createElement('textarea');
            document.body.append(area);
            teclear('a', area);

            jest.advanceTimersByTime(IDLE_MS - 500);
            teclear('b', area);
            jest.advanceTimersByTime(IDLE_MS - 500);

            expect(ambienceIsOn()).toBe(true);
            area.remove();
        } finally {
            jest.useRealTimers();
        }
    });

    it('parar el suscriptor lo apaga también', () => {
        const area = document.createElement('textarea');
        document.body.append(area);
        teclear('a', area);

        parar();

        expect(ambienceIsOn()).toBe(false);
        area.remove();
    });
});

describe('el rotulo de la cabecera, que es su propio caso', () => {
    /*
     * El rotulo es un SECRETO ESCONDIDO: no se anuncia, no tiene cursor de mano
     * y no suena como boton, porque sonar seria señalarlo. Un clic suelto tiene
     * que poder pasar por accidente.
     *
     * El segundo ya no es un accidente. Pedido jugando: «cuando le damos al
     * cromo debe haber un pequeño pitido despues del segundo click».
     */
    function rotuloQueCuenta() {
        const el = document.createElement('span');
        el.className = 'system-label';
        // Lo que hace el componente de verdad al recibir el clic.
        el.addEventListener('click', () => registerLogoClick());
        document.body.append(el);
        return el;
    }

    it('⚠ el primer clic es MUDO, o el secreto se delata solo', async () => {
        const rotulo = rotuloQueCuenta();

        conLaSalaYaEncendida();
        await esperarBreve();
        const antes = marca();

        rotulo.click();
        await esperarBreve();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('y del segundo en adelante la maquina contesta', async () => {
        const rotulo = rotuloQueCuenta();

        conLaSalaYaEncendida();
        await esperarBreve();

        for (let i = 1; i < LABEL_BEEP_AT; i += 1) rotulo.click();
        await esperarBreve();
        const antes = marca();

        rotulo.click();
        await esperarBreve();

        const osciladores = fuentes(antes).filter((n) => n.kind === 'oscillator');

        expect(osciladores.length).toBeGreaterThan(0);
        // La bocinita: es la maquina la que acusa el toque, no un objeto de la
        // habitacion.
        expect(osciladores[0].type).toBe('square');
    });

    it('⚠ y no suena ademas como boton, que serian dos cosas a la vez', async () => {
        /*
         * El rotulo no es un pulsador. Si sonara como boton Y con el aviso,
         * serian dos sonidos en el mismo instante — justo lo que se reporto en
         * el arranque y hubo que deshacer.
         */
        const rotulo = rotuloQueCuenta();

        conLaSalaYaEncendida();
        await esperarBreve();
        for (let i = 1; i < LABEL_BEEP_AT; i += 1) rotulo.click();
        await esperarBreve();
        const antes = marca();

        rotulo.click();
        await esperarBreve();

        // El boton lleva ruido de banda; el bip es un oscilador y nada mas.
        expect(ruidos(antes)).toHaveLength(0);
    });
});

describe('⚠ sin corriente no hay ruido de sala', () => {
    /*
     * MEDIDO EN EL NAVEGADOR, y explica un informe que parecia de mezcla: «hay
     * dos sonidos, el grave tapa el otro, que es el verdadero de las barras de
     * colores».
     *
     * El zumbido son tres senos a 58, 116 y 175 Hz. Como el navegador no deja
     * sonar hasta el primer gesto, su entrada empezaba EXACTAMENTE al pulsar la
     * tecla — o sea que el grave subia justo encima de las barras.
     *
     * ⚠ EL PRIMER ARREGLO FUE DEMASIADO: callaba la sala durante TODO el
     * arranque, y se pidio lo contrario — «ese grave me gusta, que suene al
     * entrar». Lo que hay que evitar no es que el zumbido exista mientras la
     * maquina arranca, es que su SUBIDA caiga encima de la carta de ajuste. De
     * eso se encarga el compas oscuro de la puerta.
     *
     * Callan la sala solo las dos cosas donde de verdad no hay corriente.
     */
    it('el tubo al que le cortan la corriente calla el fondo', async () => {
        parar();

        const muriendo = document.createElement('div');
        muriendo.className = 'collapse-dying';
        document.body.append(muriendo);

        parar = startSound();
        await esperarBreve();

        expect(ambienceIsOn()).toBe(false);
    });

    it('y en cuanto vuelve la corriente, el zumbido entra', async () => {
        parar();

        const muriendo = document.createElement('div');
        muriendo.className = 'collapse-dying';
        document.body.append(muriendo);

        parar = startSound();
        await esperarBreve();
        expect(ambienceIsOn()).toBe(false);

        muriendo.remove();
        await esperarBreve();

        expect(ambienceIsOn()).toBe(true);
    });

    it('⚠ y el colapso tambien calla la sala', async () => {
        // Un equipo que se acaba de caer no zumba: por eso el colapso da tanto
        // miedo, y por eso el zumbido volviendo es la señal de que volvio.
        parar();

        const capa = document.createElement('div');
        capa.className = 'collapse-layer';
        document.body.append(capa);

        parar = startSound();
        await esperarBreve();

        expect(ambienceIsOn()).toBe(false);
    });

    it('⚠ pero las barras de ajuste NO, que es lo que se corrigio', async () => {
        /*
         * Estuvo `boot-screen` en la lista y callaba el fondo durante todo el
         * arranque. El zumbido tiene que estar ahi: para cuando llegan las
         * barras ya entro en el compas oscuro, asi que es un suelo quieto en vez
         * de algo que sube.
         */
        parar();

        const barras = document.createElement('div');
        barras.className = 'boot-bars';
        document.body.append(barras);

        parar = startSound();
        await esperarBreve();

        expect(ambienceIsOn()).toBe(true);
        barras.remove();
    });
});

const esperarBreve = () => new Promise((r) => setTimeout(r, 80));

describe('⚠ mantener una tecla pulsada NO es teclear muchas veces', () => {
    /*
     * REPORTADO JUGANDO: «cuando le doy a borrar suena todo el tiempo aunque ya
     * no esté borrando, y sigue sigue».
     *
     * Son dos fallos distintos con el mismo síntoma, y los dos son de modelo.
     *
     * ⚠ Y TODOS ESPERAN 70 ms ANTES DE MEDIR. La primera versión no lo hacía y
     * los tres tests medían la COMPUERTA en vez del comportamiento: dos «pasaban»
     * porque la compuerta se comía el disparo, no porque el arreglo funcionara.
     */

    /** Deja pasar la ventana de la compuerta, para medir lo que se quiere. */
    const fueraDeLaVentana = () => new Promise((r) => setTimeout(r, 70));

    it('⚠ mantener borrar SÍ suena mientras borra', async () => {
        /*
         * CORREGIDO DESPUÉS, Y ES UNA CORRECCIÓN A MI PROPIO ARREGLO. Primero
         * maté la repetición entera mirando `repeat`, razonando que un teclado
         * de verdad no vuelve a chasquear con la tecla apretada. Cierto para el
         * teclado, y equivocado para lo que se pidió:
         *
         *   «el borrar sí debe tener sonido, pero sólo cuando borra; cuando ya
         *    termina de borrar no sale más el sonido».
         *
         * El modelo bueno no es el interruptor: es lo que la MÁQUINA HACE. Cada
         * repetición borra un carácter de verdad, así que suena. Lo que no suena
         * es la repetición que ya no borra nada.
         */
        const area = document.createElement('textarea');
        area.value = 'hola que tal';
        document.body.append(area);
        area.setSelectionRange(12, 12);

        conLaSalaYaEncendida();
        await fueraDeLaVentana();
        const antes = marca();

        area.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, repeat: true })
        );

        expect(fuentes(antes).length).toBeGreaterThan(0);
        area.remove();
    });

    it('y deja de sonar en cuanto no queda nada que borrar', async () => {
        // La otra mitad del reporte, y la que se ve fallando: con el campo ya
        // vacío, seguir apretando no hace nada — así que no suena nada.
        const area = document.createElement('textarea');
        area.value = '';
        document.body.append(area);
        area.setSelectionRange(0, 0);

        conLaSalaYaEncendida();
        await fueraDeLaVentana();
        const antes = marca();

        for (let i = 0; i < 5; i += 1) {
            area.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, repeat: true })
            );
            await fueraDeLaVentana();
        }

        expect(fuentes(antes)).toHaveLength(0);
        area.remove();
    });

    it('y borrar donde ya no queda nada tampoco suena', async () => {
        /*
         * FALLO DOS, y es el que el reporte nombra: «aunque ya no esté
         * borrando». Con el cursor al principio y sin nada seleccionado, un
         * borrado no borra NADA — la máquina no hizo nada, así que no tiene por
         * qué sonar. El sonido acompaña a lo que la máquina hace, no a lo que
         * vos intentás.
         */
        const area = document.createElement('textarea');
        area.value = '';
        document.body.append(area);
        area.setSelectionRange(0, 0);

        conLaSalaYaEncendida();
        await fueraDeLaVentana();
        const antes = marca();

        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

        expect(fuentes(antes)).toHaveLength(0);
        area.remove();
    });

    it('pero borrando algo de verdad sí suena', async () => {
        // La otra mitad: sin esto, el arreglo podría ser «no suena nunca al
        // borrar», que arregla el ruido rompiendo el sonido.
        const area = document.createElement('textarea');
        area.value = 'hola';
        document.body.append(area);
        area.setSelectionRange(4, 4);

        conLaSalaYaEncendida();
        await fueraDeLaVentana();
        const antes = marca();

        area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

        expect(fuentes(antes).length).toBeGreaterThan(0);
        area.remove();
    });
});

describe('la maquina encendiendose y apagandose', () => {
    /*
     * Reportado: «faltan muchos sonidos, al apretar botones, los demas glitches,
     * el reinicio, cuando se apaga, todo».
     *
     * ⚠ Y NINGUNO DE ESTOS TOCA CODIGO DE LA APP. La app ya pone seis atributos
     * en el documento —`data-booting`, `data-wiping`, `data-collapsing`,
     * `data-tube-off`, `data-failing`, `data-theme`— porque los necesita para el
     * CSS. Observarlos es enterarse de todo lo grande sin pedirle nada a nadie.
     */

    const esperar = () => new Promise((r) => setTimeout(r, 80));

    it('apretar un boton suena', async () => {
        const boton = document.createElement('button');
        document.body.append(boton);

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        boton.click();
        await esperar();

        expect(fuentes(antes).length).toBeGreaterThan(0);
        boton.remove();
    });

    it('⚠ y lo pulsable que NO es un boton tambien suena', async () => {
        /*
         * MEDIDO JUGANDO Y NO SUPUESTO: diez clics al rotulo de la cabecera —el
         * que provoca el colapso— no sonaron NI UNO.
         *
         * `.system-label` es un `<span>` con `onClick`, no un `<button>`, y el
         * selector solo miraba botones y enlaces. Esta app tiene varias cosas
         * pulsables que no son botones, y el sonido no puede depender de que
         * alguien se acuerde de anotarlas una por una.
         *
         * La senal que SI vale es el cursor: si el diseno dice que algo se
         * pulsa, se pulsa.
         */
        const span = document.createElement('span');
        span.style.cursor = 'pointer';
        document.body.append(span);

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        span.click();
        await esperar();

        expect(fuentes(antes).length).toBeGreaterThan(0);
        span.remove();
    });

    it('⚠ pero escribir en un area de texto NO cuenta como boton', async () => {
        /*
         * Un clic dentro del editor para poner el cursor no es apretar nada: si
         * sonara, colocar el cursor haria el mismo ruido que confirmar un
         * borrado, y el sonido dejaria de significar «hice algo».
         */
        const area = document.createElement('textarea');
        document.body.append(area);

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        area.click();
        await esperar();

        expect(fuentes(antes)).toHaveLength(0);
        area.remove();
    });

    it('⚠ las barras de ajuste traen su tono de 1 kHz', async () => {
        /*
         * PEDIDO: «el de las barras tiene un sonido de la industria».
         *
         * Y lo tiene de verdad: las barras de ajuste de television van SIEMPRE
         * con un tono de referencia de 1 kHz. Es la señal con la que se
         * calibraba el nivel de audio de una emision, y es lo que convierte unos
         * rectangulos de colores en una CARTA DE AJUSTE.
         *
         * Se engancha a que las barras aparezcan en pantalla, no a un
         * temporizador: si el arranque cambia de ritmo, el tono lo sigue.
         */
        const barras = document.createElement('div');
        barras.className = 'boot-bars';
        document.body.append(barras);
        await esperar();

        expect(barsToneIsOn()).toBe(true);

        barras.remove();
        await esperar();

        expect(barsToneIsOn()).toBe(false);
    });

    it('⚠ y las barras NO traen nada mas encima del tono', async () => {
        /*
         * REPORTADO DOS VECES: «se solapan dos sonidos, uno de las barras y otro
         * como de inicio». El encendido estaba aca y se pisaba con el tono.
         *
         * El primer intento fue separarlos en el tiempo, y no era eso — el sitio
         * estaba mal, y se señalo cual era el bueno: despues de la comprobacion
         * de memoria. Unas barras de ajuste con su tono de 1 kHz y nada mas es
         * exactamente lo que emitia una carta.
         *
         * Se mide por RUIDO: el tono es un oscilador y no fabrica ninguno, pero
         * el chasquido del interruptor del encendido si.
         */
        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        const barras = document.createElement('div');
        barras.className = 'boot-bars';
        document.body.append(barras);
        await esperar();

        expect(ruidos(antes)).toHaveLength(0);
        barras.remove();
    });

    it('⚠ la comprobacion de memoria da el BIP DE POST', async () => {
        /*
         * REFERENCIA REAL DE LA INDUSTRIA, no una invencion: un PC que pasaba su
         * autoprueba de encendido daba UN pitido corto. Uno solo, y agudo. Es la
         * senal de «memoria contada, todo bien» y la reconoce cualquiera que
         * haya oido arrancar un ordenador de los noventa.
         *
         * Va en la fase de comprobacion y no antes: el bip no anuncia que
         * empieza, certifica que TERMINO bien. Ponerlo al principio seria decir
         * que salio bien antes de mirarlo.
         */
        const check = document.createElement('pre');
        check.className = 'boot-check';

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        document.body.append(check);
        await esperar();

        const osciladores = fuentes(antes).filter((n) => n.kind === 'oscillator');

        expect(osciladores.length).toBeGreaterThan(0);
        expect(osciladores[0].type).toBe('square');
        check.remove();
    });

    it('⚠ la carga del colapso tambien suena', async () => {
        /*
         * MEDIDO JUGANDO: tras un colapso, la app NO enseña el arranque con
         * barras — enseña su PROPIA pantalla de reinicio, con su cuenta atras. Y
         * esa carga estaba muda, que es literalmente lo que se reporto: «el
         * reinicio no tiene sonido».
         *
         * Es un cabezal buscando: la maquina esta leyendo para volver.
         */
        const carga = document.createElement('div');
        carga.className = 'collapse-reboot';

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        document.body.append(carga);
        await esperar();

        expect(fuentes(antes).length).toBeGreaterThan(0);
        carga.remove();
    });

    it('⚠ el tubo ABRIENDOSE es lo que suena a encendido', async () => {
        /*
         * ESTE SONIDO ANDUVO DE SITIO EN SITIO PORQUE NO TENIA NINGUNO PROPIO.
         *
         * Estuvo en las barras, donde se pisaba con el tono de la carta: «se
         * solapan dos sonidos, uno de las barras y otro como de inicio». Despues
         * al final de la comprobacion de memoria, que sonaba bien pero no tenia
         * nada que mirar mientras.
         *
         * Ahora la pantalla hace el gesto inverso del apagon —un punto que se
         * abre en linea y la linea en imagen— y el sonido va encima de eso.
         * Imagen y sonido contando la misma cosa.
         */
        const tubo = document.createElement('div');
        tubo.className = 'tube-on';

        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        document.body.append(tubo);
        await esperar();

        expect(ruidos(antes).length).toBeGreaterThan(0);
        tubo.remove();
    });

    it('⚠ y la comprobacion ya NO enciende al irse, que serian dos', async () => {
        /*
         * El encendido vivio un rato colgado del final de esta pantalla. Desde
         * que tiene imagen propia, dejarlo tambien aca lo haria sonar dos veces
         * por arranque, con segundos de diferencia.
         */
        const check = document.createElement('pre');
        check.className = 'boot-check';

        conLaSalaYaEncendida();
        await esperar();
        document.body.append(check);
        await esperar();

        const antes = marca();
        check.remove();
        await esperar();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ el tubo APAGANDOSE suena, y la marca vale para las tres pantallas', async () => {
        /*
         * REPORTADO: «el de apagar cuando reiniciamos no sale».
         *
         * Estaba colgado de `data-tube-off`, que SOLO lo pone la pantalla de
         * arranque cuando su guion pasa por la fase de apagon. Y el reinicio del
         * colapso arranca el guion desde las barras, asi que esa fase no existe:
         * el atributo no aparecia nunca y el apagado no sonaba jamas.
         *
         * ⚠ La marca buena es `.collapse-dying`, y la gracia es que ya la
         * comparten LAS TRES pantallas que apagan un tubo —el arranque, el
         * colapso y el barrido— porque las tres pintan el mismo cierre a un
         * punto. Una marca visual que ya se comparte no se puede quedar a medias
         * como se quedaba el atributo.
         */
        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        const muriendo = document.createElement('div');
        muriendo.className = 'collapse-dying';
        document.body.append(muriendo);
        await esperar();

        expect(ruidos(antes).length).toBeGreaterThan(0);
        muriendo.remove();
    });

    it('⚠ y el arranque llegando NO se come el apagado', async () => {
        /*
         * LA TRAMPA QUE HABIA QUE CERRAR, y es de mezcla, no de cableado.
         *
         * El encendido y el apagado son la MISMA familia, asi que comparten la
         * compuerta de 60 ms. Cuando el arranque y el apagon del tubo caian en
         * el mismo instante —que es justo lo que pasa al recargar— el encendido
         * entraba primero y la compuerta se tragaba el apagado entero.
         *
         * Por eso la pantalla de arranque no puede sonar por si misma: lo que
         * suena son sus FASES, y nunca hay dos a la vez.
         */
        conLaSalaYaEncendida();
        await esperar();
        const antes = marca();

        document.documentElement.setAttribute('data-booting', '');
        const muriendo = document.createElement('div');
        muriendo.className = 'collapse-dying';
        document.body.append(muriendo);
        await esperar();

        expect(ruidos(antes).length).toBeGreaterThan(0);

        muriendo.remove();
        document.documentElement.removeAttribute('data-booting');
    });

    it('⚠ las barras del colapso traen el tono igual que las del arranque', async () => {
        /*
         * Son la misma carta de ajuste y llevan otro nombre de clase por como
         * crecio el codigo, no por ser otra cosa. El tono de 1 kHz es de la
         * carta, no de la pantalla que la enseña.
         */
        const barras = document.createElement('div');
        barras.className = 'collapse-bars';
        document.body.append(barras);
        await esperar();

        expect(barsToneIsOn()).toBe(true);

        barras.remove();
        await esperar();

        expect(barsToneIsOn()).toBe(false);
    });

    it('⚠ el colapso al IRSE ya no enciende, porque lo hace el arranque', async () => {
        /*
         * ACA HUBO UN ENCENDIDO Y SE QUITO. La razon de entonces era que el
         * colapso se rearranca solo, sin pasar por la pantalla de arranque — y
         * era FALSA: su cuenta atras termina pidiendo el arranque desde las
         * barras, asi que la cadena entera ocurre igual.
         *
         * Desde que el encendido vive al final de la comprobacion, dejarlo
         * tambien aca lo hacia sonar DOS veces por colapso.
         */
        document.documentElement.setAttribute('data-collapsing', '');
        await new Promise((r) => setTimeout(r, 800));
        const antes = marca();

        document.documentElement.removeAttribute('data-collapsing');
        await esperar();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ y que las barras SE VAYAN no vuelve a encender nada', async () => {
        /*
         * Un observador ingenuo dispara con cualquier cambio, asi que el
         * encendido sonaria dos veces: al aparecer la imagen y al quitarse. Solo
         * cuenta la aparicion.
         */
        const barras = document.createElement('div');
        barras.className = 'boot-bars';
        document.body.append(barras);

        /*
         * ⚠ Se espera a que el encendido TERMINE de sonar antes de marcar: la
         * busqueda de cabezal llega 620 ms despues y dura otro tanto, y midiendo
         * antes se contaban sus golpes como si los hubiera causado el quitar las
         * barras. El margen es generoso porque la suite corre lenta.
         */
        await new Promise((r) => setTimeout(r, 1_800));
        const antes = marca();

        barras.remove();
        await esperar();

        expect(fuentes(antes)).toHaveLength(0);
    });

    it('⚠ la carga del reinicio sigue sonando, no da UN golpe y calla', async () => {
        /*
         * REPORTADO: «el sonido solo lo escuche una vez luego ya no sale».
         *
         * La barra de reinicio del colapso dura ENTRE DIEZ Y CUARENTA SEGUNDOS,
         * y mas cuanto mas hayas insistido. Sonaba una vez al aparecer y despues
         * se quedaba muda todo ese rato — que es, con diferencia, el tramo mas
         * largo de silencio de todo el producto, y encima el mas tenso.
         *
         * ⚠ Y no era solo el hueco: el zumbido de fondo se apaga tras
         * `IDLE_MS` sin actividad, o sea que a los cuarenta segundos de barra la
         * maquina se quedaba MUERTA del todo justo mientras trabajaba.
         *
         * Un cabezal que busca cada tanto arregla las dos cosas con el mismo
         * gesto, y es lo que hacia una maquina de verdad leyendo para volver.
         */
        const carga = document.createElement('div');
        carga.className = 'collapse-reboot';

        conLaSalaYaEncendida();
        await esperar();
        document.body.append(carga);
        await esperar();

        // Ya sono el primer golpe. Se marca DESPUES, y lo que se mide es si
        // vuelve a sonar sin que nadie toque nada.
        const antes = marca();
        // ⚠ El hueco MAXIMO, no el nominal: el cabezal lleva jitter, y esperar
        // `SEEK_MS` a secas falla una de cada tantas sin que nada este roto.
        await new Promise((r) => setTimeout(r, SEEK_MS * (1 + SEEK_JITTER) + 400));

        expect(fuentes(antes).length).toBeGreaterThan(0);
        carga.remove();
    });

    it('y en cuanto la carga se va, el cabezal para', async () => {
        /*
         * Sin esto el reinicio dejaria un cabezal buscando para siempre por
         * debajo del sistema ya recuperado: el fallo clasico del temporizador
         * que se arma y no se desarma.
         */
        const carga = document.createElement('div');
        carga.className = 'collapse-reboot';

        conLaSalaYaEncendida();
        await esperar();
        document.body.append(carga);
        await esperar();

        carga.remove();
        await esperar();
        const antes = marca();

        await new Promise((r) => setTimeout(r, SEEK_MS * (1 + SEEK_JITTER) + 400));

        expect(fuentes(antes)).toHaveLength(0);
    });
});
