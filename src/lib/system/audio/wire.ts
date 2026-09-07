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
    subscribe as subscribeSystem,
} from '@/hooks/useSystemState';
import { play } from '@/lib/system/audio/play';
import { startAmbience, stopAmbience } from '@/lib/system/audio/ambience';
import { startBarsTone, stopBarsTone } from '@/lib/system/audio/bars';

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

    const huboActividad = () => {
        startAmbience();

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
        if (ahora.chromaticFailure && !fallandoAntes) play('beep', { hz: 180, ms: 420 });
        fallandoAntes = ahora.chromaticFailure;
    });

    /*
     * LOS GOLPES A LA PARED.
     *
     * `LooseWall` pone `is-blow` en el `body` y escribe `--blow-amp` ahí mismo.
     * Observarlo es lo que hace que el crujido lea la MISMA amplitud que mueve
     * la imagen — el §5 lo pide: lo que reacciona no puede ser una muestra.
     */
    const observador = new MutationObserver(() => {
        if (!document.body.classList.contains('is-blow')) return;

        const amp = parseFloat(
            getComputedStyle(document.body).getPropertyValue('--blow-amp')
        );

        play('glitchBurst', {
            amplitudePx: Number.isFinite(amp) ? amp : 6,
            durationMs: 120,
        });
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
    const ATRIBUTOS = ['data-booting', 'data-wiping', 'data-collapsing', 'data-tube-off'] as const;

    const presentes = new Set(ATRIBUTOS.filter((a) => document.documentElement.hasAttribute(a)));

    /*
     * ⚠ EL ARRANQUE DE LA PRIMERA CARGA SE INTENTA IGUAL, aunque probablemente
     * no suene. Se reportó jugando: «el inicio, cuando aparecen las barras de
     * colores y el logo, no tiene el sonido de empezar».
     *
     * El navegador crea todo `AudioContext` suspendido hasta que hay un gesto, y
     * en la primera carga de la vida no hay ninguno: ahí no hay nada que hacer.
     * PERO Chrome levanta esa restricción en sitios con los que ya has
     * interactuado bastante, así que en las visitas siguientes SÍ puede sonar —
     * y no intentarlo era garantizar que no sonara nunca.
     *
     * Si el navegador lo bloquea no pasa nada malo: el contexto queda dormido y
     * el primer gesto lo despierta, porque `ensureAudio` reintenta el arranque
     * en cada llamada.
     */
    if (document.documentElement.hasAttribute('data-booting')) {
        play('powerUp');
        setTimeout(() => play('head'), 620);
    }
    let temaAntes = document.documentElement.getAttribute('data-theme');

    const observadorRaiz = new MutationObserver(() => {
        const raiz = document.documentElement;

        for (const attr of ATRIBUTOS) {
            const hay = raiz.hasAttribute(attr);

            if (hay && !presentes.has(attr)) {
                huboActividad();

                if (attr === 'data-booting') {
                    // El tubo prendiéndose, y después algo buscando.
                    play('powerUp');
                    setTimeout(() => play('head'), 620);
                } else if (attr === 'data-tube-off') {
                    // El tubo al que le cortan la corriente. NO es un barrido:
                    // ver `powerDown`, que fue lo que se reportó como poco
                    // natural.
                    play('powerDown');
                } else {
                    // El barrido y el colapso: la señal cayéndose, y algo que
                    // llega al suelo detrás.
                    play('sweep', { fromHz: 1_100, toHz: 60, ms: 900 });
                    setTimeout(() => play('thud'), 620);
                }
            }

            /*
             * ⚠ Y EL COLAPSO SUENA TAMBIÉN AL IRSE, que es cuando la máquina
             * VUELVE. Medido jugando: el colapso sonaba —barrido e impacto— y
             * su reinicio no, porque el colapso NO usa la pantalla de arranque:
             * se rearranca solo con su propia cuenta atrás, así que
             * `data-booting` no aparece nunca. Lo que sí pasa es que
             * `data-collapsing` se va, y ése es el momento exacto del encendido.
             */
            if (!hay && presentes.has(attr) && attr === 'data-collapsing') {
                huboActividad();
                play('powerUp');
            }

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
    const mirarBarras = () => {
        if (document.querySelector('.boot-bars')) startBarsTone();
        else stopBarsTone();
    };

    const observadorBarras = new MutationObserver(mirarBarras);
    observadorBarras.observe(document.body, { childList: true, subtree: true });
    mirarBarras();

    return () => {
        if (reloj) clearTimeout(reloj);
        stopAmbience();
        document.removeEventListener('keydown', alTeclear, true);
        document.removeEventListener('click', alPulsar, true);
        quitarGlitch();
        quitarSistema();
        observador.disconnect();
        observadorRaiz.disconnect();
        observadorBarras.disconnect();
        stopBarsTone();
    };
}
