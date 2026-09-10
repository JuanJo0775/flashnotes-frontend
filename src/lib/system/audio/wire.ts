// src/lib/system/audio/wire.ts
'use client';

/**
 * EL ÚNICO SITIO DESDE EL QUE LA APP SUENA.
 *
 * ⚠ ES LA DECISIÓN QUE HAY QUE ACERTAR A LA PRIMERA, y el plan lo dice sin
 * rodeos: si el sonido se reparte por los componentes quedan disparos huérfanos
 * en sitios que nadie recuerda, y el día que algo suene de más no hay forma de
 * saber quién lo pidió. No es una hipótesis — `awardFrom` ya se llama desde
 * NUEVE sitios distintos, y ése es exactamente el futuro que esto evita.
 *
 * Todo cuelga de eventos QUE YA EXISTEN. Cuatro de las cinco fuentes no tocan
 * una sola línea de la app:
 *
 *   · el almacén del sistema, para los hallazgos y las averías,
 *   · el almacén del glitch, que es el mismo cambio de estado que pinta el tirón,
 *   · una escucha de teclado en el documento, en captura,
 *   · un observador del `body`, para los golpes a la pared.
 *
 * Y ninguna de ellas sabe nada de sonido: acá se traduce estado a voz, y la voz
 * pasa siempre por `play`, que es quien aplica el presupuesto y la compuerta.
 */

import { DURATION_MS, getGlitch, subscribe as subscribeGlitch } from '@/hooks/useGlitch';
import {
    foundSecrets,
    getSystemState,
    logoClicks,
    subscribe as subscribeSystem,
} from '@/hooks/useSystemState';
import { play } from '@/lib/system/audio/play';
import { isV02 } from '@/lib/system/v02';
import { muteFor } from '@/lib/system/audio/mix';
import { duck, invertAmbience, silence } from '@/lib/system/audio/ambience';
import { ART_TOTAL, readFound as piezasGanadas } from '@/lib/system/asciiArt';
import {
    CEREMONIA_ACUSE_MS,
    CEREMONIA_ESPERA_MS,
    CEREMONIA_MS,
} from '@/lib/system/ceremonia';
import { subscribeHints } from '@/lib/system/artHints';
import { WAKE_FADE_S, startAmbience, stopAmbience } from '@/lib/system/audio/ambience';
import { startBarsTone, stopBarsTone } from '@/lib/system/audio/bars';
import { vary } from '@/lib/system/audio/jitter';
import {
    NOT_RUNNING_MARKS,
    SCREEN_SELECTOR,
    SCREEN_SOUNDS,
    type ScreenSound,
    fire,
} from '@/lib/system/audio/screens';

/**
 * Cuánto aguanta el zumbido sin que pase nada.
 *
 * ⚠ ES LA MITAD QUE HACE QUE NO CANSE. Un ambiente que se queda para siempre es
 * exactamente el lecho que este diseño descartó: agota en cinco minutos y
 * enmascara todo lo demás. Cuarenta segundos es bastante más de lo que dura una
 * pausa escribiendo, y bastante menos de lo que dura irse a leer otra cosa.
 */
export const IDLE_MS = 40_000;

/**
 * A partir de qué clic en el rótulo de la cabecera la máquina se queja.
 *
 * ⚠ EL PRIMERO SIGUE SIENDO MUDO, Y ESO NO ES UN DETALLE. El rótulo es un
 * secreto escondido: no se anuncia, no tiene cursor de mano y no suena como un
 * botón, porque sonar sería señalarlo. Un clic suelto tiene que poder pasar por
 * accidente.
 *
 * El segundo ya no es un accidente, y ahí empieza a contestar. Es lo que convierte
 * la escalada en algo que se OYE venir antes de verse: el aviso, el parpadeo de
 * versión al tercero, la avería del quinto al octavo y el colapso al noveno.
 */
export const LABEL_BEEP_AT = 2;

/**
 * Los milisegundos de SILENCIO ABSOLUTO del derrumbe (§26).
 *
 * ⚠ El plan lo llama «el recurso más barato y más fuerte del documento entero»,
 * y tiene razón: después de veinte minutos con algo de fondo, quitarlo de golpe
 * es lo más fuerte que se puede hacer. No cuesta ni un fichero.
 *
 * Doscientos y no más: es un hueco, no una pausa. Más largo dejaría de leerse
 * como que algo se cortó y empezaría a leerse como que se acabó.
 */
export const COLLAPSE_SILENCE_MS = 200;

/**
 * Cuánto se agacha la sala mientras él habla.
 *
 * Lo que dura una frase suya leyendo sin prisa. Vuelve sola y despacio después:
 * una habitación que se calla de golpe y vuelve de golpe llama la atención sobre
 * sí misma, y acá la atención va en otra parte.
 */
export const DUCK_MS = 3_200;


/**
 * Los hallazgos que suenan MAL.
 *
 * ⚠ SON CUATRO DE LOS CINCO `entity-*`, y el que falta no es un olvido.
 *
 * Éstos son los que no encontraste vos: te los dio él. Despertarlo, contestarle
 * bien, decirle que no y volver al día siguiente pasan DENTRO de la relación, y
 * en los cuatro el hallazgo llega porque él lo puso ahí.
 *
 * `entity-reported` se queda fuera a propósito: es el único que conseguiste
 * VOLVIÉNDOTE EN SU CONTRA. Ése no te lo dio, se lo quitaste — y que suene
 * limpio justo ahí lo convierte en una pequeña traición, que vale más que una
 * melodía número treinta y cuatro.
 */
const SUYOS = new Set(['entity-awake', 'entity-proved', 'entity-refused', 'entity-gift']);

/**
 * ¿Este borrado va a borrar algo?
 *
 * ⚠ REPORTADO JUGANDO: «cuando le doy a borrar suena todo el tiempo aunque ya no
 * esté borrando». Con el cursor al principio y sin nada seleccionado, un
 * retroceso no borra NADA: la máquina no hizo nada, así que no tiene por qué
 * sonar. El sonido acompaña a lo que la máquina HACE, no a lo que vos intentás.
 */
function borraAlgo(el: HTMLTextAreaElement | HTMLInputElement, key: string): boolean {
    const { selectionStart: ini, selectionEnd: fin } = el;

    // Sin cursor consultable —algunos tipos de `input` no lo dan— se asume que
    // sí: callar de más es peor que sonar de más.
    if (ini === null || fin === null) return true;

    if (ini !== fin) return true;

    return key === 'Backspace' ? ini > 0 : ini < el.value.length;
}

/** Qué cuenta como escribir. Pulsar Tab o Escape no es teclear. */
function estaEscribiendo(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    return (
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLInputElement ||
        target.isContentEditable
    );
}

/**
 * Enchufa el sonido a la app. Devuelve cómo desenchufarlo.
 *
 * Se llama UNA vez. Llamarlo dos veces deja dos suscriptores y todo suena
 * doble, así que quien lo monta se encarga de parar el anterior.
 */
export function startSound(): () => void {
    /*
     * EL ZUMBIDO, QUE ESTÁ DESDE EL PRINCIPIO.
     *
     * ⚠ ESTO ESTUVO MAL Y SE CORRIGIÓ TRAS UN MALENTENDIDO MÍO. Lo tenía
     * arrancando con la primera actividad, razonando que un ambiente que
     * aparece antes de que hagas nada se oye ENTRAR. Eso es cierto de un
     * ambiente que sube de golpe, y me llevó a la conclusión equivocada:
     *
     *   «el sonido es ambiente, debe sonar desde el inicio sin que algo lo
     *    active»
     *
     * El fondo no es una reacción a lo que hacés: es el ruido de que la máquina
     * está encendida, y una máquina encendida no espera a que la toquen. Lo que
     * evita que se oiga entrar no es retrasarlo — es que suba despacio, y eso ya
     * lo hacía.
     *
     * Lo único que sigue mandando es el navegador: si todavía no deja sonar, los
     * osciladores quedan programados y se oyen en cuanto el contexto despierte.
     * Un zumbido continuo es justo lo que mejor sobrevive a esa espera, porque
     * no es un instante: sigue ahí cuando llega el permiso.
     */
    let reloj: ReturnType<typeof setTimeout> | null = null;

    /*
     * ⚠ Y NO ZUMBA MIENTRAS LA MÁQUINA ARRANCA. Ver `NOT_RUNNING_MARKS`: el
     * fondo es el ruido de un aparato ENCENDIDO, y un equipo que todavía está
     * arrancando no lo tiene. Se midió que su entrada de cuatro segundos caía
     * justo encima de las barras y se comía el tono de 1 kHz.
     *
     * Se arranca mirando el documento porque `startSound` corre antes del primer
     * repaso de pantallas, y en una recarga la de arranque YA está puesta.
     */
    let enMarcha = !document.querySelector(NOT_RUNNING_MARKS.map((m) => `.${m}`).join(', '));

    /*
     * ⚠ TODO LO QUE SE APLAZA SE APUNTA, Y NO ES CELO: `parar()` PROMETE
     * DESENCHUFAR EL SONIDO.
     *
     * Varias voces son de dos tiempos —el encendido y su cabezal 620 ms
     * despues, el barrido y su impacto— y el segundo tiempo vivia en un
     * `setTimeout` suelto que nadie cancelaba. Apagar el sonido, o cambiar de
     * pantalla, dejaba el golpe en el aire: sonaba despues de haberlo apagado.
     *
     * Se cazó en los tests, y ahí se vio lo que era: un golpe aparecia en una
     * medición a la que no pertenecia. Es el mismo fallo que en la app se oye
     * como un ruido sin causa.
     */
    const pendientes = new Set<ReturnType<typeof setTimeout>>();

    /** Un `setTimeout` que `parar()` sí sabe cancelar. */
    const luego = (ms: number, fn: () => void) => {
        const id = setTimeout(() => {
            pendientes.delete(id);
            fn();
        }, ms);

        pendientes.add(id);
    };

    const huboActividad = (fadeS?: number) => {
        if (enMarcha) startAmbience(Math.random, fadeS);
        else stopAmbience();

        if (reloj) clearTimeout(reloj);
        reloj = setTimeout(stopAmbience, IDLE_MS);
    };

    // Y arranca YA, sin esperar a nada.
    huboActividad();

    /*
     * LAS TECLAS.
     *
     * En captura y sobre el documento: así no hace falta que ningún componente
     * sepa que existe el sonido, y sigue funcionando el día que aparezca otro
     * sitio donde se escriba.
     *
     * ⚠ Sólo si el foco está escribiendo de verdad. Con cualquier tecla,
     * navegar con el tabulador haría ruido de teclado sin que nadie escriba: la
     * tecla es el sonido de ESCRIBIR, no el de tocar el teclado.
     */
    const alTeclear = (e: KeyboardEvent) => {
        if (!estaEscribiendo(e.target)) return;

        /*
         * ⚠ LA REPETICIÓN SÍ SUENA, Y ESTO CORRIGE UN ARREGLO MÍO ANTERIOR.
         *
         * Primero la maté entera mirando `repeat`, razonando que un teclado de
         * verdad no vuelve a chasquear con la tecla apretada. Es cierto del
         * teclado y es el modelo equivocado, porque lo que se pidió fue esto:
         *
         *   «el borrar sí debe tener sonido, pero sólo cuando borra; cuando ya
         *    termina de borrar no sale más el sonido».
         *
         * El modelo bueno no es el interruptor: es LO QUE LA MÁQUINA HACE. Cada
         * repetición borra un carácter de verdad, así que suena. La que ya no
         * borra nada, no — y de eso se encarga `borraAlgo`, que es donde estaba
         * el problema desde el principio.
         */

        // Los modificadores solos no golpean nada: pulsar Shift para una
        // mayúscula tiene que sonar UNA vez, la de la letra.
        const borrado = e.key === 'Backspace' || e.key === 'Delete';
        if (e.key.length !== 1 && !borrado && e.key !== 'Enter') return;

        // Y un borrado que no borra nada tampoco.
        if (
            borrado &&
            (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) &&
            !borraAlgo(e.target, e.key)
        ) {
            return;
        }

        huboActividad();
        play('key');
    };

    document.addEventListener('keydown', alTeclear, true);

    /*
     * EL GLITCH, DEL MISMO CAMBIO DE ESTADO QUE PINTA LA IMAGEN.
     *
     * Ésta es la razón de suscribirse en vez de disparar a mano: el tirón y su
     * ruido salen del mismo suceso, así que no hay dos relojes que sincronizar.
     * Y la duración sale de la tabla del glitch, no de una copia.
     */
    let glitchAntes = getGlitch().active;

    const quitarGlitch = subscribeGlitch(() => {
        const ahora = getGlitch();

        if (ahora.active && !glitchAntes) {
            huboActividad();
            play('glitchBurst', {
                amplitudePx: ahora.amplitudePx,
                durationMs: DURATION_MS[ahora.severity],
            });
        }

        glitchAntes = ahora.active;
    });

    /*
     * LOS HALLAZGOS.
     *
     * El almacén avisa de que la cuenta subió; cuál subió se deduce comparando
     * el conjunto con el que había. Así `markSecretFound` no tiene que avisar a
     * nadie, y la regla de «no suena dos veces» la hereda de él en vez de
     * tenerla repetida acá.
     */
    let secretosAntes = new Set(foundSecrets());
    let fallandoAntes = getSystemState().chromaticFailure;

    /*
     * LO QUE PASA CON LAS NOTAS, que hasta acá era lo único mudo del uso normal.
     *
     * ⚠ NO HIZO FALTA TOCAR LA APP: las dos cuentas ya estaban publicadas en el
     * almacén del sistema —una para la barra de estado, la otra para el secreto
     * del recuento— y este suscriptor ya estaba escuchando ese almacén por los
     * hallazgos. Se miran igual que se miran los secretos: comparando con lo que
     * había.
     */
    let tiradaAntes = getSystemState().noteTrashedAt;
    let vueltaAntes = getSystemState().noteRestoredAt;
    let definitivosAntes = getSystemState().permanentDeletes;

    const quitarSistema = subscribeSystem(() => {
        const ahora = getSystemState();
        const secretos = foundSecrets();

        for (const id of secretos) {
            if (secretosAntes.has(id)) continue;

            huboActividad();
            play('confirm', { wrong: SUYOS.has(id) });
        }

        secretosAntes = new Set(secretos);

        // La señal cayéndose es lo más fuerte que hace la máquina sola.
        if (ahora.chromaticFailure && !fallandoAntes) {
            /*
             * ⚠ Y EN LA v0.2 SUENA PEOR, que es lo único que este suscriptor
             * sabe de versiones. Se permite acá y no en la tabla porque la
             * avería de señal no tiene marca propia: la enciende el almacén, no
             * una pantalla.
             *
             * Más agudo y más largo: el bip de la 1.0 es grave y corto, casi un
             * golpe. Éste es un zumbador barato quejándose, que es lo que hay
             * cuando lo único que suena es el altavoz.
             */
            play('beep', isV02() ? { hz: 240, ms: 560 } : { hz: 180, ms: 420 });
        }
        fallandoAntes = ahora.chromaticFailure;

        /*
         * A LA PAPELERA: algo cae dentro del cesto.
         *
         * El impacto solo, sin el barrido que lo trae en el §26. Ahí es lo que
         * llega al suelo detrás de algo que cae; acá es lo único que pasa, y por
         * eso alcanza — una nota tirada no se cae de la pantalla, se deja caer.
         *
         * ⚠ Y SE PUEDE DESHACER, así que no suena a final. Lo que suena a final
         * es lo de abajo.
         */
        if (ahora.noteTrashedAt !== tiradaAntes && ahora.noteTrashedAt !== null) {
            huboActividad();
            play('thud');
        }
        tiradaAntes = ahora.noteTrashedAt;

        /*
         * Y EL BORRADO DEFINITIVO: el cajón que se cierra.
         *
         * ⚠ ES EL MISMO CAJÓN DEL PREMIO, AL REVÉS, y ahí está todo lo que hay
         * que decir. Se abre para sacar una pieza que te ganaste y se cierra
         * cuando algo se fue para no volver: la misma madera contando las dos
         * únicas cosas de esta app que son para siempre.
         */
        if (ahora.permanentDeletes > definitivosAntes) {
            huboActividad();
            play('drawer', { closing: true });
        }
        definitivosAntes = ahora.permanentDeletes;

        /*
         * Y LO QUE VUELVE: el cajón se abre.
         *
         * ⚠ EL MISMO CAJÓN DE LA PIEZA GANADA, y por eso no hace falta una voz
         * nueva. La regla que lo gobierna es de una línea: se abre cuando algo
         * vuelve a tus manos —una pieza que te ganaste, una nota que rescataste—
         * y se cierra cuando algo se va para siempre.
         */
        if (ahora.noteRestoredAt !== vueltaAntes && ahora.noteRestoredAt !== null) {
            huboActividad();
            play('drawer', { closing: false });
        }
        vueltaAntes = ahora.noteRestoredAt;
    });

    /*
     * LA ENTREGA DE UNA PIEZA: un cajón que se abre.
     *
     * ⚠ CUELGA DEL ALMACÉN Y NO DE LOS NUEVE SITIOS QUE REGALAN ARTE. `awardFrom`
     * se llama desde nueve componentes distintos —el pong, el bloqueo, el reloj,
     * la sesión larga— y poner el sonido en cada uno era exactamente el futuro
     * que este módulo existe para evitar. Acá se compara la cuenta, igual que con
     * los secretos.
     *
     * ⚠ Y LLEGA UN POCO DESPUÉS, A PROPÓSITO. Ganar una pieza suele coincidir con
     * encontrar un secreto, y las dos voces son de la misma familia: en el mismo
     * instante la compuerta se comería una de las dos, y cuál se salva sería
     * cuestión de suerte. Separadas se leen como lo que son — «eso contaba», y
     * detrás, «y además te llevas esto».
     */
    let piezasAntes = piezasGanadas().size;

    const quitarArte = subscribeHints(() => {
        const ahora = piezasGanadas().size;

        if (ahora > piezasAntes) {
            huboActividad();
            luego(220, () => play('drawer', { closing: false }));

            /*
             * ⚠ Y LA ÚLTIMA SE CELEBRA, que era el único logro largo del juego
             * sin un solo sonido. Dieciséis piezas por dieciséis caminos
             * distintos, y al poner la última no pasaba nada: el contador decía
             * 16/16 y ya.
             *
             * No hay voz nueva ni fanfarria. Lo que hay es lo más caro que tiene
             * esta app y lo que menos se usa: la sala CALLÁNDOSE. El cuarto
             * desaparece, el cajón queda solo en el silencio, y encima cae el
             * acuse. Es el mismo recurso del §26 —ahí el silencio es una
             * amenaza— y acá es lo contrario: la máquina haciendo sitio.
             *
             * El orden importa. Primero suena el cajón (220 ms), después se cae
             * el cuarto, y el acuse llega DENTRO del hueco.
             */
            if (ahora >= ART_TOTAL && piezasAntes < ART_TOTAL) {
                luego(CEREMONIA_ESPERA_MS, () => silence(CEREMONIA_MS));
                luego(CEREMONIA_ACUSE_MS, () => play('confirm', { wrong: false }));
            }
        }

        piezasAntes = ahora;
    });

    /*
     * LOS GOLPES A LA PARED.
     *
     * `LooseWall` pone `is-blow` en el `body` y escribe `--blow-amp` ahí mismo.
     * Observarlo es lo que hace que el crujido lea la MISMA amplitud que mueve
     * la imagen — el §5 lo pide: lo que reacciona no puede ser una muestra.
     */
    let derrumbandose = false;

    const observador = new MutationObserver(() => {
        /*
         * EL DERRUMBE DEL §26: SILENCIO ABSOLUTO, Y DESPUÉS TODO LO DEMÁS.
         *
         * `LooseWall` pone `is-failing` en el `body` cuando el sistema se cae
         * del todo. Se calla el zumbido a CERO EXACTO —no a casi nada, que no es
         * lo mismo— y se cierra el paso a cualquier voz nueva, porque justo ahí
         * empieza el parpadeo de tema y un silencio con relés dentro no es un
         * silencio.
         */
        const cayendo = document.body.classList.contains('is-failing');

        if (cayendo && !derrumbandose) {
            silence(COLLAPSE_SILENCE_MS);
            muteFor(COLLAPSE_SILENCE_MS);
        }

        derrumbandose = cayendo;

        if (!document.body.classList.contains('is-blow')) return;

        const amp = parseFloat(
            getComputedStyle(document.body).getPropertyValue('--blow-amp')
        );

        /*
         * ⚠ UN CRUJIDO, NO UN GLITCH, y esto se corrigió. Acá sonaba
         * `glitchBurst`, que es el ruido de la SEÑAL rompiéndose: eléctrico,
         * escalonado, de banda ancha. Lo que pasa en la pantalla es otra cosa
         * entera — un objeto físico pegado que cede a golpes. Madera y yeso, no
         * electrónica.
         *
         * El comentario de arriba ya lo llamaba «el crujido» desde el primer día;
         * sólo faltaba construirlo.
         */
        play('tear', { amplitudePx: Number.isFinite(amp) ? amp : 6 });
    });

    observador.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });

    /*
     * LOS BOTONES.
     *
     * ⚠ Un botón NO es una tecla, y suena distinto a propósito: son dos objetos.
     * Y sólo cuentan los controles de verdad — un clic dentro del editor para
     * poner el cursor no es apretar nada, y si sonara, colocar el cursor haría
     * el mismo ruido que confirmar un borrado.
     */
    const alPulsar = (e: MouseEvent) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;

        /*
         * EL RÓTULO DE LA CABECERA, que es su propio caso y no un botón.
         *
         * No suena como pulsador —ver `LABEL_BEEP_AT`: es un secreto, y sonar lo
         * señalaría— pero desde el segundo clic la máquina contesta.
         */
        if (t.closest('.system-label')) {
            /*
             * ⚠ EN UNA MICROTAREA. Esta escucha va en CAPTURA, y el contador lo
             * sube el propio rótulo cuando le llega el clic — o sea DESPUÉS.
             * Leerlo acá daría siempre uno menos y el aviso llegaría tarde. Una
             * microtarea corre cuando el reparto del evento terminó entero.
             */
            queueMicrotask(() => {
                if (logoClicks() < LABEL_BEEP_AT) return;

                huboActividad();
                // Corto y agudo: no es una alarma, es la máquina notando que la
                // están tocando.
                play('beep', { hz: 1_480, ms: 45 });
            });

            return;
        }

        /*
         * ⚠ NO BASTA CON MIRAR SI ES UN BOTÓN, y esto se midió jugando: diez
         * clics al rótulo de la cabecera —el que provoca el colapso— no sonaron
         * NI UNO. `.system-label` es un `<span>` con `onClick`.
         *
         * Esta app tiene varias cosas pulsables que no son botones, y el sonido
         * no puede depender de que alguien se acuerde de anotarlas una por una:
         * la próxima que se añada volvería a quedarse muda en silencio.
         *
         * La señal que SÍ vale es el CURSOR. Si el diseño dice que algo se pulsa
         * —y lo dice poniendo el cursor de mano— entonces se pulsa. Ningún
         * elemento nuevo puede escaparse de eso sin verse raro primero.
         */
        const pulsable = t.closest('button, a, [role="button"], input, label, summary');
        const conMano = getComputedStyle(t).cursor === 'pointer';

        if (!pulsable && !conMano) return;

        // Escribir no es pulsar: un clic para poner el cursor en el editor haría
        // el mismo ruido que confirmar un borrado.
        if (estaEscribiendo(t)) return;

        huboActividad();
        play('button');
    };

    document.addEventListener('click', alPulsar, true);

    /*
     * LA MÁQUINA ENCENDIÉNDOSE Y APAGÁNDOSE.
     *
     * ⚠ NO TOCA UNA LÍNEA DE LA APP, y es la mejor parte: la app ya pone estos
     * atributos en el documento porque los necesita para el CSS —el arranque
     * apaga a sus hermanos, el barrido desvanece la app entera— así que
     * observarlos es enterarse de todo lo grande sin pedirle nada a nadie.
     *
     * Sólo cuenta la APARICIÓN. Un observador ingenuo dispara con cualquier
     * cambio, y entonces el arranque sonaría dos veces: al empezar y al acabar.
     */
    /*
     * ⚠ NI `data-booting` NI `data-tube-off` ESTÁN ACÁ, Y ESO ES EL ARREGLO.
     *
     * Los dos estuvieron, y los dos eran el modelo equivocado. Se reportó así:
     * «el de apagar cuando reiniciamos no sale».
     *
     * `data-booting` no quiere decir «el tubo se encendió»: quiere decir «la
     * pantalla de arranque está puesta». Y esa pantalla EMPIEZA con el equipo
     * apagándose — la primera fase de su guion es el apagón. Colgar el encendido
     * de ahí lo disparaba ANTES del apagado, o sea al revés de como pasa; y como
     * encender y apagar son la misma familia, la compuerta de 60 ms se tragaba
     * entero el apagado que venía detrás.
     *
     * `data-tube-off` era peor todavía: sólo lo pone la pantalla de arranque
     * cuando su guion pasa por la fase de apagón, y el reinicio del colapso
     * arranca el guion DESDE LAS BARRAS. Esa fase no existe ahí, así que el
     * atributo no aparecía nunca y el apagado no sonaba jamás.
     *
     * Encenderse y apagarse ahora cuelgan de lo que se VE, más abajo. Acá quedan
     * sólo los dos que sí son un suceso entero por sí mismos.
     */
    const ATRIBUTOS = ['data-wiping', 'data-collapsing'] as const;

    const presentes = new Set(ATRIBUTOS.filter((a) => document.documentElement.hasAttribute(a)));

    let temaAntes = document.documentElement.getAttribute('data-theme');

    const observadorRaiz = new MutationObserver(() => {
        const raiz = document.documentElement;

        for (const attr of ATRIBUTOS) {
            const hay = raiz.hasAttribute(attr);

            if (hay && !presentes.has(attr)) {
                // El barrido y el colapso: la señal cayéndose, y algo que llega
                // al suelo detrás.
                huboActividad();
                play('sweep', { fromHz: 1_100, toHz: 60, ms: 900 });
                luego(620, () => play('thud'));
            }

            /*
             * ⚠ ACÁ HUBO UN ENCENDIDO AL IRSE EL COLAPSO Y SE QUITÓ. La razón
             * de entonces era que el colapso se rearranca solo, sin pasar por la
             * pantalla de arranque — y era FALSA: su cuenta atrás termina
             * pidiendo el arranque desde las barras, así que la cadena entera
             * ocurre igual.
             *
             * Desde que el encendido vive al final de la comprobación, dejarlo
             * acá lo hacía sonar DOS veces por colapso: una al volver y otra al
             * arrancar de verdad.
             */

            if (hay) presentes.add(attr);
            else presentes.delete(attr);
        }

        /*
         * EL TEMA FALLANDO. Cada parpadeo es un relé cerrando — es lo que el
         * plan pide para el cambio de claro a oscuro cuando se rompe, y sale
         * gratis porque el tema ya vive en un atributo.
         */
        const tema = raiz.getAttribute('data-theme');
        if (tema !== temaAntes) {
            temaAntes = tema;
            huboActividad();
            play('relay');
        }
    });

    observadorRaiz.observe(document.documentElement, { attributes: true });

    /*
     * LAS BARRAS DE AJUSTE Y SU TONO.
     *
     * ⚠ El tono de 1 kHz de las barras no es una licencia: es el de la
     * industria. Las cartas de ajuste iban SIEMPRE con él, porque era la señal
     * con la que se calibraba el nivel de audio de una emisión — y es justo lo
     * que convierte unos rectángulos de colores en algo que se reconoce.
     *
     * Se engancha a que las barras APAREZCAN en pantalla y no a un temporizador:
     * si el arranque cambia de ritmo, el tono lo sigue solo. Un temporizador
     * paralelo se desincroniza el día que alguien ajuste una duración, y nadie
     * lo nota hasta que el tono se queda sonando sobre el logo.
     */
    /*
     * ⚠ LO QUE SE VE ES LO QUE MANDA, y la lista vive en `screens.ts`.
     *
     * Un atributo del documento dice en qué PANTALLA estás; una clase del árbol
     * dice qué está pasando EN ella. El encendido y el apagado del tubo son
     * fases de una pantalla, no pantallas, y colgarlos del atributo era lo que
     * los dejaba mudos o cambiados de orden.
     *
     * Acá abajo no hay ninguna decisión: se recorre la tabla. Lo que decide qué
     * suena y cuándo es un DATO, y por eso una pantalla nueva que pinte una marca
     * conocida suena bien sin que nadie venga a tocar esto.
     */
    const visto = new Set<string>();
    const repitiendo = new Map<string, ReturnType<typeof setTimeout>>();

    const pararRepeticion = (mark: string) => {
        const id = repitiendo.get(mark);
        if (id === undefined) return;

        clearTimeout(id);
        repitiendo.delete(mark);
    };

    /*
     * El golpe que vuelve mientras la marca siga puesta.
     *
     * Con jitter: a compás exacto suena a metrónomo, y un disco buscando nunca
     * encuentra dos veces a la misma distancia.
     */
    const repetir = (s: ScreenSound) => {
        if (!s.repeat || !s.shot) return;

        const otra = () => {
            const id = setTimeout(() => {
                huboActividad();
                fire(s.shot!);
                otra();
            }, vary(s.repeat!.ms, s.repeat!.jitter));

            repitiendo.set(s.mark, id);
        };

        otra();
    };

    /*
     * EL TIC DEL TELETIPO, una vez por LÍNEA impresa.
     *
     * ⚠ POR LÍNEA Y NUNCA POR CARÁCTER. Las respuestas se teclean letra a letra
     * —dieciocho milisegundos cada una— y un tic por carácter sería una
     * ametralladora aunque la compuerta lo recortara. Un teletipo golpea el papel
     * una vez por renglón, y ése es el ritmo que hace que una respuesta se sienta
     * IMPRESA en lugar de aparecida.
     *
     * ⚠ Y NO TOCA EL MARCADO DE LA RESPUESTA, que era la tentación. Envolver cada
     * línea en su propio elemento habría cambiado cómo se parten las largas —la
     * respuesta usa `pre-wrap` y las filas de `//help` usan `pre`, que es otra
     * cosa— y un sonido no puede permitirse mover la maquetación. Se observa el
     * texto donde ya está.
     *
     * Cuenta las dos formas de imprimir un renglón que tiene esta app: un salto
     * de línea en el texto tecleado, y una fila entera de las que `//help` revela
     * de golpe. Las dos crecen de una en una.
     */
    let teletipo: MutationObserver | null = null;
    let lineasAntes = 0;

    const cuantasLineas = (el: Element) =>
        (el.textContent?.split('\n').length ?? 1) - 1 + el.querySelectorAll('.reply-row').length;

    const mirarTeletipo = () => {
        const el = document.querySelector('.editor-reply-body');

        if (!el) {
            teletipo?.disconnect();
            teletipo = null;
            lineasAntes = 0;
            return;
        }

        // Ya se está mirando ésta. Volver a observar dejaría dos tics por línea.
        if (teletipo) return;

        lineasAntes = cuantasLineas(el);

        teletipo = new MutationObserver(() => {
            const ahora = cuantasLineas(el);

            if (ahora > lineasAntes) {
                huboActividad();
                play('tick');
            }

            lineasAntes = ahora;
        });

        /*
         * ⚠ `characterData` ACÁ Y NO EN EL `body`. El texto crece letra a letra,
         * así que hay que mirar los datos y no sólo los hijos — pero mirar el
         * documento entero a ese detalle sería carísimo. Acotado a la respuesta,
         * que es un elemento pequeño y que casi nunca existe, no cuesta nada.
         */
        teletipo.observe(el, { childList: true, subtree: true, characterData: true });
    };

    /*
     * LA SALA HACIÉNDOLE SITIO.
     *
     * ⚠ SE PIDE UNA VEZ, AL APARECER, y no en cada repaso: `duck` programa una
     * bajada y su vuelta, así que repetirla cancelaría la vuelta y el zumbido se
     * quedaría abajo para siempre. Es al revés que la inversión, que es un
     * destino y por eso sí se puede repetir.
     */
    const agachada = new Set<string>();

    const alAgacharse = (enPantalla: Set<string>) => {
        for (const s of SCREEN_SOUNDS) {
            if (!s.ducks) continue;

            const hay = enPantalla.has(s.mark);

            if (hay && !agachada.has(s.mark)) {
                huboActividad();
                duck(DUCK_MS);
            }

            if (hay) agachada.add(s.mark);
            else agachada.delete(s.mark);
        }
    };

    /*
     * EL PONG, que ocurre entre fotogramas.
     *
     * ⚠ SUS TRES TONOS SON LOS DE VERDAD. El pong original tenía exactamente
     * tres sonidos —paleta, pared y punto— y los tres eran la misma onda
     * cuadrada a distinta altura, porque el circuito no daba para más. Eso es lo
     * que hace que dos blips se reconozcan como un juego y no como una interfaz.
     *
     * El juego publica contadores en su raíz y acá se miran subir. Un `play()`
     * dentro del componente sería el primer disparo huérfano fuera de este
     * módulo — ver el encabezado.
     */
    let pong: MutationObserver | null = null;
    let peloteo = 0;
    let rebotes = 0;
    let perdido = false;
    let parado = false;
    let cuadriculado = false;

    const leerPong = (el: Element, primera: boolean) => {
        const n = (attr: string) => Number(el.getAttribute(attr) ?? 0);

        const ahoraPeloteo = n('data-rally');
        const ahoraRebotes = n('data-bounces');
        const ahoraPerdido = el.getAttribute('data-over') === 'yes';
        const ahoraParado = el.getAttribute('data-paused') === 'yes';
        const ahoraCuadriculado = el.getAttribute('data-render') === 'quantised';

        if (!primera) {
            // La paleta: el más grave de los tres, porque es el que vos hacés.
            if (ahoraPeloteo > peloteo) {
                huboActividad();
                play('beep', { hz: 300, ms: 45 });
            }

            // La pared y el techo: más agudo y más corto. No lo hiciste vos.
            if (ahoraRebotes > rebotes) {
                huboActividad();
                play('beep', { hz: 620, ms: 30 });
            }

            // Y el punto: largo y abajo. Es el único de los tres que dura.
            if (ahoraPerdido && !perdido) {
                huboActividad();
                play('beep', { hz: 170, ms: 320 });
            }

            // Parar y seguir son un interruptor, no un blip: el relé es
            // exactamente eso, y ya existe.
            if (ahoraParado !== parado) {
                huboActividad();
                play('relay');
            }

            /*
             * LA TABLA DE GLIFOS CAYÉNDOSE: el juego pasa a dibujarse con
             * caracteres, y eso sí es la señal rompiéndose — el mismo tirón que
             * el resto de la app, no un sonido de juego.
             *
             * ⚠ PEQUEÑO, Y SÓLO AL LLEGAR. Pasa cada tanto y solo: un tirón
             * grande convertiría una avería de fondo en el protagonista, y el
             * protagonista acá es la pelota. Volver a la normalidad no suena
             * porque volver no es un suceso: es dejar de pasar algo.
             */
            if (ahoraCuadriculado && !cuadriculado) {
                huboActividad();
                play('glitchBurst', { amplitudePx: 3, durationMs: 110 });
            }
        }

        peloteo = ahoraPeloteo;
        rebotes = ahoraRebotes;
        perdido = ahoraPerdido;
        parado = ahoraParado;
        cuadriculado = ahoraCuadriculado;
    };

    const mirarPong = () => {
        const el = document.querySelector('.pong-layer');

        if (!el) {
            pong?.disconnect();
            pong = null;
            return;
        }

        if (pong) return;

        // La primera lectura NO suena: es el estado con el que se abre, no algo
        // que haya pasado.
        leerPong(el, true);

        pong = new MutationObserver(() => leerPong(el, false));
        pong.observe(el, {
            attributes: true,
            attributeFilter: [
                'data-rally',
                'data-bounces',
                'data-over',
                'data-paused',
                'data-render',
            ],
        });
    };

    const mirarPantallas = () => {
        // UNA sola pasada por el documento y no una por marca: esto corre en cada
        // mutación del `body` entero, y el colapso reescribe su manta de estática
        // DOCE VECES POR SEGUNDO. El encargo era que el sonido no pese.
        const enPantalla = new Set<string>();
        for (const el of document.querySelectorAll(SCREEN_SELECTOR)) {
            for (const c of el.classList) enPantalla.add(c);
        }

        /*
         * ¿Está la máquina en marcha? Mientras se vea una pantalla de arranque o
         * un colapso, no — y entonces la sala calla. Se mira ANTES que las voces
         * para que el zumbido entre con la app y no encima de ella.
         */
        const antesEnMarcha = enMarcha;
        enMarcha = !NOT_RUNNING_MARKS.some((m) => enPantalla.has(m));

        /*
         * ⚠ AL VOLVER LA CORRIENTE, EL ZUMBIDO ENTRA DEPRISA. Los cuatro
         * segundos de siempre existen para que el fondo no se oiga entrar a
         * mitad de una sesión; acá es al revés — el aparato acaba de recibir
         * corriente y eso SE OYE. Y además tiene que caber en el compás oscuro
         * del arranque, o volvería a subir encima de las barras.
         */
        if (enMarcha !== antesEnMarcha) huboActividad(enMarcha ? WAKE_FADE_S : undefined);

        /*
         * LA SALA DADA VUELTA, mientras el ojo mira. Ver `inverts`: el zumbido
         * sube y el aire de la caja se enmudece.
         *
         * Se manda el estado ENTERO en cada repaso y no sólo en los flancos: la
         * inversión es una rampa hacia un destino, así que repetir el mismo
         * destino no cuesta nada y evita quedarse dado vuelta si el flanco de
         * bajada se pierde entre dos mutaciones.
         */
        invertAmbience(SCREEN_SOUNDS.some((s) => s.inverts && enPantalla.has(s.mark)));

        /*
         * Y LA SALA AGACHÁNDOSE cuando contesta él. Ver `ducks`: el zumbido baja
         * y vuelve solo, así que se pide una vez, al aparecer la marca — no en
         * cada repaso, o cada mutación reiniciaría la bajada y no volvería nunca.
         */
        alAgacharse(enPantalla);

        // El tono de la carta de ajuste, lo enseñe quien lo enseñe.
        if (SCREEN_SOUNDS.some((s) => s.tone && enPantalla.has(s.mark))) startBarsTone();
        else stopBarsTone();

        for (const s of SCREEN_SOUNDS) {
            const hay = enPantalla.has(s.mark);

            if (hay && !visto.has(s.mark)) {
                huboActividad();

                if (s.shot) fire(s.shot);

                const segundo = s.then;
                if (segundo) luego(segundo.ms, () => fire(segundo));

                repetir(s);
            }

            /*
             * Y lo que suena al IRSE. Hay momentos que no son la aparición de
             * nada sino el final de algo — el sistema arrancando pasa cuando la
             * comprobación de memoria TERMINA — y sin esto habría que inventarles
             * una pantalla para poder oírlos.
             */
            if (!hay && visto.has(s.mark) && s.onGone) {
                huboActividad();
                fire(s.onGone);
            }

            // Se apaga en cuanto la marca se va, o el cabezal seguiría buscando
            // para siempre por debajo del sistema ya recuperado.
            if (hay) {
                visto.add(s.mark);
            } else {
                pararRepeticion(s.mark);
                visto.delete(s.mark);
            }
        }

        mirarTeletipo();
        mirarPong();
    };

    const observadorPantallas = new MutationObserver(mirarPantallas);
    observadorPantallas.observe(document.body, { childList: true, subtree: true });
    mirarPantallas();

    return () => {
        if (reloj) clearTimeout(reloj);
        pendientes.forEach(clearTimeout);
        pendientes.clear();
        repitiendo.forEach(clearTimeout);
        repitiendo.clear();
        stopAmbience();
        document.removeEventListener('keydown', alTeclear, true);
        document.removeEventListener('click', alPulsar, true);
        quitarGlitch();
        quitarSistema();
        quitarArte();
        observador.disconnect();
        observadorRaiz.disconnect();
        observadorPantallas.disconnect();
        teletipo?.disconnect();
        pong?.disconnect();
        stopBarsTone();
    };
}
