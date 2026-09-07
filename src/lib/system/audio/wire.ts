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

        // Los modificadores solos no golpean nada: pulsar Shift para una
        // mayúscula tiene que sonar UNA vez, la de la letra.
        if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;

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

    return () => {
        if (reloj) clearTimeout(reloj);
        stopAmbience();
        document.removeEventListener('keydown', alTeclear, true);
        quitarGlitch();
        quitarSistema();
        observador.disconnect();
    };
}
