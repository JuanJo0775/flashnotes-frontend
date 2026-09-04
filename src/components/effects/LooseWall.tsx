// src/components/effects/LooseWall.tsx
'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { HITS_TO_FALL, hitWall, wallLean } from '@/lib/system/looseWall';
import { hasScar, helpedHim, somethingLoose } from '@/lib/system/entityEnding';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { getLang } from '@/i18n';
import type { Localized } from '@/i18n';
import { ART, artOf } from '@/lib/system/asciiArt';

/**
 * El cuadro que quedó flojo, y lo que hay detrás.
 *
 * ⚠ ES UNA VENTANA DE ERROR MÁS, y ahí está todo el truco: las fantasmas llevan
 * `pointer-events: none` desde que existen —son cuadros pintados encima que no
 * pueden atrapar nada— así que UNA QUE RESPONDE AL CLIC es, por sí sola, lo que
 * está mal. Él te dijo que había algo suelto y no dijo qué. Esto es lo que hay
 * que notar.
 *
 * ⚠ CLICS COMO GOLPES, NO COMO INTERFAZ. No hay botón, no hay foco, no hay
 * cursor de mano y no hay contador: cada clic la deja peor y eso se ve, que es
 * la única forma de que alguien siga pegando sin que nadie se lo pida.
 *
 * Y por eso NO es accesible por teclado, que es la única vez en toda la app que
 * eso se decide a propósito: darle `role="button"` y un `tabIndex` la anunciaría
 * como un control, y un control es justo lo que no es. Lo que hay es un fallo.
 * Ver la nota de accesibilidad al final del fichero.
 */

/** Cuánto dura el derrumbe antes de que todo falle, en milisegundos. */
const CAIDA_MS = 2600;

/** Y cuánto se ve la estática con el ojo dentro. */
const ESTATICA_MS = 1800;

type Fase = 'entera' | 'cayendo' | 'estatica' | 'nada';

/** Esto no cambia solo: se mira una vez al montar y ya. */
const SIN_CAMBIOS = () => () => {};

/**
 * Lo que dice el cuadro suelto.
 *
 * `Localized` y no un ternario sobre el idioma: al añadir una lengua deja de
 * compilar en vez de servir inglés en silencio. Hay un test que lo vigila en
 * todo `src/`.
 *
 * Y dice lo justo. «No está sujeto» es una avería más, igual que las otras seis
 * — sólo que ésta, si le pegás, se mueve.
 */
const SUELTO: Localized = {
    es: 'ESTE CUADRO NO ESTÁ SUJETO',
    en: 'THIS WINDOW IS NOT FASTENED',
};

export function LooseWall() {
    const [golpes, setGolpes] = useState(0);
    const [fase, setFase] = useState<Fase>('entera');
    const quieto = usePrefersReducedMotion();

    /*
     * ⚠ NO SE LEE EL ALMACENAMIENTO AL PINTAR (REGLAS · C1/C2).
     *
     * `useSyncExternalStore` devuelve el snapshot del SERVIDOR en el primer
     * render del cliente, así que hasta que está montado esto no existe — que
     * es lo mismo que hace `page.tsx` con la colección. Leerlo directamente
     * rompería la hidratación, y un `setState` en un efecto lo prohíbe el
     * linter, con razón: son renders en cascada.
     */
    const montado = useSyncExternalStore(
        SIN_CAMBIOS,
        () => true,
        () => false
    );

    const suelto = montado && somethingLoose();

    const pegar = useCallback(() => {
        const van = hitWall();
        setGolpes(van);

        if (van < HITS_TO_FALL) return;

        /*
         * SE CAYÓ. Y el orden importa: primero se ve caer, después la estática
         * con el ojo, y sólo al final falla todo y reinicia.
         *
         * Contarlo al revés —premio primero, teatro después— convertiría el
         * derrumbe en una animación de recompensa, que es lo contrario de lo
         * que es: acabás de romper algo.
         */
        setFase('cayendo');

        window.setTimeout(() => setFase('estatica'), quieto ? 0 : CAIDA_MS);

        window.setTimeout(
            () => {
                /*
                 * ⚠ LA PIEZA SE DA ACÁ, con la estática todavía en pantalla.
                 *
                 * `helpedHim()` lo pone en `ido`, da el ojo y deja la pared
                 * como estaba. Lo que queda después es la cicatriz: esa zona
                 * temblando de vez en cuando, sin que nadie te lo cuente.
                 */
                helpedHim();
                setFase('nada');

                // Y todo falla. Se recarga entero, que es el «reinicia y vuelve
                // la normalidad» — con el arranque de siempre: apagón, barras,
                // rótulo, carga, inicio.
                window.location.reload();
            },
            quieto ? 0 : CAIDA_MS + ESTATICA_MS
        );
    }, [quieto]);

    if (fase === 'estatica') return <Estatica />;
    if (fase === 'nada') return null;

    /*
     * ⚠ MIENTRAS CAE SE SIGUE PINTANDO, aunque ya no esté «suelta».
     *
     * Esta condición llevaba `fase === 'entera'` metida y el derrumbe no se
     * veía nunca: en cuanto empezaba a caer, el componente devolvía otra cosa y
     * el cuadro desaparecía de golpe. Lo cazó el compilador, avisando de que la
     * comparación de abajo con `'cayendo'` no podía darse.
     */
    if (!suelto && fase === 'entera') {
        // La cicatriz: en pie otra vez, pero esa zona tiembla de vez en cuando.
        return montado && hasScar() ? <Cicatriz /> : null;
    }

    const inclinacion = wallLean(golpes);

    return (
        <div
            aria-hidden="true"
            onMouseDown={pegar}
            className="phantom-error loose-wall"
            style={{
                // Cada golpe la deja más torcida y más despegada. Es continuo a
                // propósito: con tres estados fijos, los golpes de en medio no
                // harían nada visible y se dejaría de pegar.
                transform: `rotate(${inclinacion * 9}deg) translate(${
                    inclinacion * 14
                }px, ${inclinacion * 22}px)`,
                opacity: fase === 'cayendo' ? 0 : 1 - inclinacion * 0.25,
                transition: quieto
                    ? 'none'
                    : `transform 180ms ease-out, opacity ${CAIDA_MS}ms linear`,
                // ⚠ LA ÚNICA que recibe el clic. Las demás no.
                pointerEvents: 'auto',
                cursor: 'default',
            }}
        >
            <span className="phantom-error__code">0x0000</span>
            <span className="phantom-error__text">
                {SUELTO[getLang()]}
            </span>
        </div>
    );
}

/**
 * Lo que hay detrás: estática, y en la estática un ojo.
 *
 * El ojo es la MISMA pieza de la colección, no un dibujo aparte. Que lo que ves
 * detrás de la pared sea exactamente lo que después te llevás es lo que ata las
 * dos cosas — si fueran dos dibujos parecidos, el premio sería una ilustración
 * de lo que pasó en vez de ser lo que pasó.
 */
function Estatica() {
    const ojo = ART.find((p) => p.id === 'eye');

    return (
        <div aria-hidden="true" className="wall-static">
            <pre className="wall-static__eye">{ojo ? artOf(ojo) : ''}</pre>
        </div>
    );
}

/**
 * ⚠ LA CICATRIZ.
 *
 * La pared está de vuelta como si no hubiera pasado nada, pero esa zona tiembla
 * de vez en cuando. Nadie te lo cuenta y no se puede volver a tirar: sólo vos
 * sabés por qué pasa.
 *
 * Va sin texto y sin cuadro — es un temblor en el aire, no un elemento. Ponerle
 * contenido lo convertiría en un recordatorio, y un recordatorio es alguien
 * contándotelo.
 */
function Cicatriz() {
    return <div aria-hidden="true" className="wall-scar" />;
}

/*
 * NOTA DE ACCESIBILIDAD, que aquí no es un descuido sino una decisión.
 *
 * Todo esto va con `aria-hidden` y fuera del orden de tabulación, igual que las
 * ventanas fantasma y el resto de los efectos: no se anuncia, no roba el foco y
 * no interrumpe nada. Quien navegue con lector de pantalla no se encuentra un
 * control fantasma en mitad del editor.
 *
 * El precio, dicho claro: este final concreto no se puede alcanzar sin ratón.
 * Se aceptó porque la alternativa era peor — anunciar «botón» sobre algo cuyo
 * sentido entero es que NO es un botón le arruina el hallazgo a todo el mundo, y
 * encima mentiría sobre lo que hay. El resto de la colección, incluidos los dos
 * finales, sigue siendo alcanzable: `//report` es un comando y se teclea.
 */
