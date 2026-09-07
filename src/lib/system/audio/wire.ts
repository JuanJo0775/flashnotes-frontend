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
     * EL ZUMBIDO, QUE ENTRA CON LO PRIMERO QUE HAGAS.
     *
     * No arranca al cargar: el navegador no deja sonar hasta que hay un gesto, y
     * además un ambiente que aparece antes de que hagas nada se oye ENTRAR — y
     * entonces deja de ser ambiente para ser un suceso. Entra tan despacio que
     * no se nota, y para cuando reparás en él ya estaba.
     */
    let reloj: ReturnType<typeof setTimeout> | null = null;

    const huboActividad = () => {
        startAmbience();

        if (reloj) clearTimeout(reloj);
        reloj = setTimeout(stopAmbience, IDLE_MS);
    };

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

        if (!t.closest('button, a, [role="button"]')) return;

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
    let temaAntes = document.documentElement.getAttribute('data-theme');

    const observadorRaiz = new MutationObserver(() => {
        const raiz = document.documentElement;

        for (const attr of ATRIBUTOS) {
            const hay = raiz.hasAttribute(attr);

            if (hay && !presentes.has(attr)) {
                huboActividad();

                if (attr === 'data-booting') {
                    // El reinicio: la corriente entra y algo busca. En ese orden.
                    play('capacitor');
                    setTimeout(() => play('head'), 380);
                } else if (attr === 'data-tube-off') {
                    // El tubo al que le cortan la corriente.
                    play('sweep', { fromHz: 760, toHz: 45, ms: 420 });
                } else {
                    // El barrido y el colapso: la señal cayéndose, y algo que
                    // llega al suelo detrás.
                    play('sweep', { fromHz: 1_100, toHz: 60, ms: 900 });
                    setTimeout(() => play('thud'), 620);
                }
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

    return () => {
        if (reloj) clearTimeout(reloj);
        stopAmbience();
        document.removeEventListener('keydown', alTeclear, true);
        document.removeEventListener('click', alPulsar, true);
        quitarGlitch();
        quitarSistema();
        observador.disconnect();
        observadorRaiz.disconnect();
    };
}
