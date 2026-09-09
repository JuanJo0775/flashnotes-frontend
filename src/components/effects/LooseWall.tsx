// src/components/effects/LooseWall.tsx
'use client';

import type { CSSProperties } from 'react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { HITS_TO_FALL, hitWall, wallLean } from '@/lib/system/looseWall';
import { hasScar, helpedHim, somethingLoose } from '@/lib/system/entityEnding';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
    ChromaSplitFilters,
    FLICKER_GAP_MS,
    FLICKER_STEPS,
} from '@/components/effects/ChromaticFailure';
import { flipThemeVolatile } from '@/hooks/useTheme';
import {
    EYE_ARC_FRAMES,
    EYE_STILL_FRAME,
    FRAME_MS,
    eyeAt,
    rainFrame,
} from '@/lib/system/eyeStatic';

/**
 * El pedazo de pantalla que quedó flojo, y lo que hay detrás.
 *
 * ⚠ NO ES UNA VENTANA: ES UN TROZO DEL FONDO, y la diferencia lo es todo.
 *
 * Una ventana de error es un objeto que la app pone ENCIMA — algo que aparece y
 * desaparece sin que signifique nada— así que romperla no dice nada del sitio
 * donde estás. Un trozo de la PANTALLA que se despega dice otra cosa: que el
 * fondo era una superficie, que tenía un detrás, y que ese detrás estaba ahí
 * todo el tiempo.
 *
 * Por eso el pedazo va pintado del MISMO color que la página y con el MISMO
 * grano encima (ver `glitch.css`). Mientras está en su sitio no se ve, porque
 * es la pantalla. Sólo cuando se mueve empieza a asomar lo que tapaba.
 *
 * ⚠ CLICS COMO GOLPES, NO COMO INTERFAZ. No hay botón, no hay foco, no hay
 * cursor de mano y no hay contador: cada golpe lo despega más y eso se ve, que
 * es la única forma de que alguien siga pegando sin que nadie se lo pida. Es lo
 * único de toda la app que responde al clic sin ser un control.
 *
 * Ver la nota de accesibilidad al final del fichero.
 */

/**
 * Cuánto dura un golpe.
 *
 * Lo que tarda en apagarse la sacudida, y por tanto lo que dura la clase en el
 * `body` y la capa de franjas. Corto: un golpe es un instante, no un estado.
 */
const GOLPE_MS = 240;

/** Cuánto tarda el pedazo en desprenderse del todo, en milisegundos. */
const CAIDA_MS = 1600;

/**
 * Cuánto dura lo que hay detrás.
 *
 * ⚠ NO ES UN NÚMERO ELEGIDO: ES LA DURACIÓN DEL ARCO DEL OJO. Antes había dos
 * temporizadores acá —uno para abrirlo y otro para cerrarlo— y entonces el ojo
 * no se cerraba porque quisiera sino porque se acababa el tiempo. Ahora el arco
 * entero (llegar, resolverse, abrirse, mirar, parpadear, cerrarse, irse) lo
 * decide `eyeAt()`, y esto sólo lo espera.
 */
const OJO_MS = EYE_ARC_FRAMES * FRAME_MS;

/**
 * Y cuánto dura el fallo del sistema antes de reiniciar.
 *
 * ⚠ TIENE QUE CABER LA SACUDIDA DE TEMA ENTERA, con un respiro después: si la
 * recarga llegara a mitad de la ráfaga, el final sería un corte en vez de un
 * derrumbe.
 */
const FALLO_MS = FLICKER_STEPS * FLICKER_GAP_MS + 420;

/**
 * Cuánto se queda el ojo quieto con `prefers-reduced-motion`.
 *
 * No corre el arco —la lluvia no hierve— así que se muestra el fotograma en que
 * te mira y se aguanta ahí. El final se ve; lo que no hay es movimiento.
 */
const QUIETO_MS = 3400;

type Fase = 'entera' | 'cayendo' | 'abierto' | 'fallando' | 'nada';

/**
 * Los sitios donde el clic es de la app y no de la pared.
 *
 * ⚠ EL PEDAZO ES EL CRISTAL, así que está por delante de todo — y por eso no
 * puede quedarse los clics de nadie. Se escucha en captura, y si el golpe cae
 * sobre algo con lo que se puede interactuar, es de la app y sigue su camino.
 * Sin esto, un rectángulo invisible de 340×224 por delante del editor se
 * comería las pulsaciones en mitad del texto.
 *
 * La lista es de HTML, no de esta app: son los elementos con los que se
 * interactúa en cualquier página. Una lista de clases del proyecto habría que
 * ir manteniéndola, y se rompería en silencio el día que alguien renombrara
 * una.
 */
const CONTROLES =
    'a, button, input, textarea, select, summary, [role="button"], [contenteditable], [tabindex]:not([tabindex="-1"])';

/**
 * De qué color está pintada la pantalla justo en este punto.
 *
 * ⚠ SE MIDE, NO SE SUPONE. El pedazo no pinta nada mientras está pegado —por
 * eso es de verdad un trozo de pantalla— pero en cuanto se despega tiene que
 * verse caer, y entonces sí necesita un color. Uno fijo sólo acierta en una
 * vista y en un tema: sobre el papel del editor, el mismo trozo que era
 * invisible se volvía un parche. Así que en el instante en que se suelta se
 * mira qué hay pintado ahí de verdad y se lo lleva puesto.
 *
 * Se sube desde lo que hay bajo el punto hasta la raíz y se devuelve el primer
 * fondo que pinte algo; los transparentes no cuentan, que es justo lo que
 * significa ser transparente.
 */
function colorDeLaPantalla(x: number, y: number): string | null {
    for (
        let el = document.elementFromPoint(x, y);
        el !== null && el !== document.documentElement;
        el = el.parentElement
    ) {
        const fondo = getComputedStyle(el).backgroundColor;

        if (fondo !== 'transparent' && !/,\s*0\)$/.test(fondo)) return fondo;
    }

    return null;
}

/** Esto no cambia solo: se mira una vez al montar y ya. */
const SIN_CAMBIOS = () => () => {};

export function LooseWall({ onReboot }: { onReboot?: () => void } = {}) {
    const [golpes, setGolpes] = useState(0);
    const [golpeando, setGolpeando] = useState(false);
    const [fase, setFase] = useState<Fase>('entera');
    const quieto = usePrefersReducedMotion();

    /*
     * Los temporizadores de la escena, para poder cancelarlos.
     *
     * Sin esto, salir de la página a mitad del final dejaba corriendo una
     * recarga y una llamada a `helpedHim()` sobre un componente que ya no
     * existe. El premio se daba igual, pero en el momento equivocado.
     */
    const relojes = useRef(new Set<number>());

    /** El pedazo, para saber dónde cae cada golpe. */
    const trozo = useRef<HTMLDivElement | null>(null);

    const luegoDe = useCallback((ms: number, fn: () => void) => {
        const id = window.setTimeout(() => {
            relojes.current.delete(id);
            fn();
        }, ms);
        relojes.current.add(id);
    }, []);

    useEffect(() => {
        const abiertos = relojes.current;

        return () => {
            abiertos.forEach((id) => window.clearTimeout(id));
            abiertos.clear();
            document.body.classList.remove('is-blow', 'is-failing');
            document.body.style.removeProperty('--blow-amp');
            document.body.style.removeProperty('--slab-bg');
        };
    }, []);

    /*
     * ⚠ NO SE LEE EL ALMACENAMIENTO AL PINTAR (REGLAS · C1/C2).
     *
     * `useSyncExternalStore` devuelve el snapshot del SERVIDOR en el primer
     * render del cliente, así que hasta que está montado esto no existe — lo
     * mismo que hace `page.tsx` con la colección. Leerlo directamente rompería
     * la hidratación, y un `setState` en un efecto lo prohíbe el linter, con
     * razón: son renders en cascada.
     */
    const montado = useSyncExternalStore(
        SIN_CAMBIOS,
        () => true,
        () => false
    );

    const suelto = montado && somethingLoose();

    /**
     * ⚠ TODO FALLA, Y ENTONCES REINICIA.
     *
     * El ojo se fue y lo que queda es una pantalla con un agujero. Acá se cae:
     * la separación de canales, el tirón y las franjas los pone `glitch.css`
     * con la clase; el TEMA se cae desde acá, con la misma sacudida de la
     * avería de señal — claro, oscuro, claro, oscuro. Es lo que convierte el
     * reinicio en un derrumbe en vez de en una recarga.
     */
    const derrumbe = useCallback(() => {
        setFase('fallando');
        document.body.classList.add('is-failing');

        /*
         * ⚠ LA SACUDIDA DE TEMA NO CORRE CON MOVIMIENTO REDUCIDO. Un parpadeo
         * de pantalla completa a 120 ms es exactamente lo que quien pide menos
         * movimiento está pidiendo no tener, y acá no hay excusa que valga: es
         * la única parte de todo esto que puede hacer daño de verdad.
         *
         * Los pasos son PARES, como en la avería: impares dejarían el tema
         * cambiado al terminar, y lo que ve el ente no puede cambiarte una
         * preferencia tuya.
         */
        if (!quieto) {
            for (let i = 0; i < FLICKER_STEPS; i += 1) {
                luegoDe(i * FLICKER_GAP_MS, flipThemeVolatile);
            }
        }

        luegoDe(quieto ? 0 : FALLO_MS, () => {
            /*
             * ⚠ LA PIEZA SE DA ACÁ, con el sistema ya cayéndose.
             *
             * `helpedHim()` lo pone en `ido`, da el ojo y deja la pantalla como
             * estaba. Lo que queda después es la cicatriz: esa zona temblando
             * de vez en cuando, sin que nadie te lo cuente.
             */
            helpedHim();
            setFase('nada');

            /*
             * ⚠ SE LIMPIA EL DERRUMBE A MANO, y esto es nuevo. Con una recarga
             * de verdad daba igual —el documento se iba entero—, pero el
             * reinicio de adentro no destruye nada: `is-failing` se quedaría
             * puesta y la app volvería partida en canales, temblando, para
             * siempre. El desmontaje ya lo limpia, y este componente NO se
             * desmonta: se queda pintando nada.
             */
            document.body.classList.remove('is-blow', 'is-failing');
            document.body.style.removeProperty('--blow-amp');

            /*
             * Y REINICIA, con el arranque de siempre: apagón, encendido, barras,
             * rótulo, comprobación. Eso es «vuelve la normalidad».
             *
             * ⚠ POR DENTRO Y NO CON UNA RECARGA, y el motivo es el sonido. Una
             * recarga destruye el documento, y el que nace después no tiene
             * permiso para sonar hasta el primer gesto: el final del juego
             * terminaba en un arranque MUDO, que es el peor sitio posible para
             * quedarse sin sonido. Por dentro no se navega a ninguna parte, así
             * que el ciclo entero se oye como se ve.
             *
             * La recarga queda de respaldo por si nadie pasó el reinicio: mejor
             * volver muda que no volver.
             */
            if (onReboot) onReboot();
            else window.location.reload();
        });
    }, [luegoDe, quieto, onReboot]);

    /*
     * ⚠ CADA GOLPE SACUDE LA PANTALLA CON EL FALLO CROMÁTICO. EL DE VERDAD.
     *
     * No un efecto parecido: los mismos `@keyframes` que la avería de la señal
     * (§14). Inventar uno propio para esto diría que es otra clase de avería, y
     * es la misma — el sitio se rompe de una sola manera.
     *
     * Y si sólo se moviera el pedazo, se leería como arrastrar una ficha. Que
     * se resienta todo lo demás es lo que lo convierte en pegarle a la
     * superficie donde vive todo.
     */
    const pegar = useCallback(() => {
        const van = hitWall();
        setGolpes(van);

        /*
         * ⚠ EL PRIMER GOLPE ES CUANDO EL PEDAZO SE LLEVA PUESTO SU COLOR.
         *
         * Hasta ahora no pintaba nada, que es la única forma de ser de verdad
         * un trozo de pantalla en cualquier vista y en los dos temas. Pero a
         * partir de este golpe se despega, y algo que se despega tiene que
         * tener superficie o ladearse no significa nada.
         *
         * Así que se mide AHORA, en el último instante en que sigue pegado y
         * «lo que hay debajo» quiere decir algo: el lienzo si estás en la
         * lista, el papel si estás en una nota, el tono que toque en claro o en
         * oscuro. El fotograma siguiente es idéntico al anterior.
         */
        if (van === 1) {
            const caja = trozo.current?.getBoundingClientRect();

            if (caja !== undefined) {
                const fondo = colorDeLaPantalla(
                    caja.left + caja.width / 2,
                    caja.top + caja.height / 2
                );

                if (fondo !== null) {
                    document.body.style.setProperty('--slab-bg', fondo);
                }
            }
        }

        /*
         * ⚠ Y PEGA MÁS FUERTE CADA VEZ. La amplitud llega por variable, igual
         * que el temblor de fondo de la casa: es la misma señal contada más
         * alto, no otra señal. Nadie te dice cuántos golpes faltan, así que lo
         * único que puede decírtelo es que cada uno duela más.
         */
        document.body.style.setProperty('--blow-amp', `${2 + van * 1.2}px`);
        document.body.classList.add('is-blow');
        setGolpeando(true);

        luegoDe(GOLPE_MS, () => {
            document.body.classList.remove('is-blow');
            setGolpeando(false);
        });

        if (van < HITS_TO_FALL) return;

        /*
         * SE DESPRENDIÓ. Y el orden importa: primero se ve caer el pedazo,
         * después queda el hueco con lo que hay detrás, y sólo al final falla
         * todo y reinicia.
         *
         * Contarlo al revés —premio primero, teatro después— convertiría el
         * derrumbe en una animación de recompensa, que es lo contrario de lo
         * que es: acabás de romper algo.
         */
        if (quieto) {
            // Sin movimiento no hay caída que ver: el hueco queda abierto y el
            // ojo se enseña quieto.
            setFase('abierto');
            luegoDe(QUIETO_MS, derrumbe);
            return;
        }

        setFase('cayendo');
        luegoDe(CAIDA_MS, () => {
            setFase('abierto');
            luegoDe(OJO_MS, derrumbe);
        });
    }, [derrumbe, luegoDe, quieto]);

    /*
     * ⚠ LOS GOLPES SE RECOGEN DEL DOCUMENTO, no del propio pedazo.
     *
     * El trozo vive DETRÁS de la app —para caer por detrás de la barra de abajo
     * y para que el editor lo tape— así que el área vacía del contenedor se
     * queda el clic antes de que llegue, aunque sea transparente. Se escucha
     * arriba, se mira si el golpe cae dentro del pedazo, y se comprueba que la
     * pared esté a la vista ahí: si hay algo pintado en medio, es que el trozo
     * está tapado y no se le puede pegar. Lo que tapa, tapa.
     *
     * Se escucha SÓLO mientras la pared está entera. Después no hay nada que
     * golpear, y un oyente global vivo de más es un clic robado esperando.
     */
    useEffect(() => {
        if (!suelto || fase !== 'entera') return;

        const enElTrozo = (e: MouseEvent) => {
            const caja = trozo.current?.getBoundingClientRect();
            if (caja === undefined) return false;

            const dentro =
                e.clientX >= caja.left &&
                e.clientX <= caja.right &&
                e.clientY >= caja.top &&
                e.clientY <= caja.bottom;

            if (!dentro) return false;

            // Si el golpe cae sobre un control, el clic es de la app.
            const destino = e.target;

            return !(
                destino instanceof Element &&
                destino.closest(CONTROLES) !== null
            );
        };

        const golpe = (e: MouseEvent) => {
            if (!enElTrozo(e)) return;

            e.preventDefault();
            e.stopPropagation();
            pegar();
        };

        /*
         * ⚠ Y EL GOLPE SE LO TRAGA. Antes el pedazo era una capa por delante
         * con `pointer-events`, así que el clic moría ahí solo. Ahora llega
         * primero acá y seguiría su camino hasta la app: pegarle a la pared
         * pasaría a hacer también lo que hubiera debajo. Se corta en captura,
         * antes que nadie, y se cortan los tres eventos del ratón — parar el
         * `mousedown` no impide el `click` ni el `dblclick`, que viajan solos.
         */
        const tragar = (e: MouseEvent) => {
            if (!enElTrozo(e)) return;

            e.preventDefault();
            e.stopPropagation();
        };

        document.addEventListener('mousedown', golpe, true);
        document.addEventListener('click', tragar, true);
        document.addEventListener('dblclick', tragar, true);

        return () => {
            document.removeEventListener('mousedown', golpe, true);
            document.removeEventListener('click', tragar, true);
            document.removeEventListener('dblclick', tragar, true);
        };
    }, [fase, pegar, suelto]);

    if (fase === 'nada') return null;

    // La cicatriz: la pantalla está entera otra vez, pero esa zona tiembla de
    // vez en cuando.
    if (!suelto && fase === 'entera') {
        return montado && hasScar() ? <Cicatriz /> : null;
    }

    const inclinacion = wallLean(golpes);

    return (
        <>
            {/*
                ⚠ LOS FILTROS DEL CROMO, montados mientras haya algo suelto.
                `chroma-swap` apunta a `url(#chroma-split-a)`, y si esos `defs`
                no están en el DOM la animación corre y no pinta nada. Fue
                exactamente lo que pasó la primera vez.
            */}
            <ChromaSplitFilters />

            {/*
                ⚠ LAS FRANJAS DEL GOLPE, Y LAS DEL DERRUMBE, SON LA MISMA CAPA
                QUE LAS DEL GLITCH AMBIENTAL. La clase es la de la casa, sin una
                regla nueva: el sitio se rompe de una sola manera.

                Y va acá arriba, hermana de la zona, porque desde dentro del
                contenedor no podía taparla: el contenedor abre contexto de
                apilamiento, así que la pantalla salía rayada y el pedazo
                limpio. Un golpe que respeta justo el trozo que estás golpeando
                no es un golpe.
            */}
            {(golpeando || fase === 'fallando') && (
                <div aria-hidden="true" className="glitch-bands" />
            )}

            <div
                aria-hidden="true"
                className={[
                    'loose-zone',
                    golpes > 0 ? 'loose-zone--suelta' : '',
                    fase === 'entera' ? '' : 'loose-zone--cae',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
                {/*
                    El hueco: lo que hay detrás de la pantalla, esperando.

                    ⚠ TRES CAPAS, NO UNA. Binario, estática e interferencia. Con
                    la lluvia sola es un gráfico bonito; las tres conviviendo
                    son lo que convierte un dibujo en algo que está
                    TRANSMITIENDO desde el otro lado.

                    Y en ese orden: primero lo que se transmite, y encima lo que
                    lo estropea.
                */}
                <div className="loose-hole">
                    {/*
                        ⚠ LA ESTÁTICA VA DETRÁS DEL BINARIO, no sólo encima. Los
                        dígitos son el velo; el ojo es donde el velo no está. Si
                        detrás no hubiera nada, mirar por el ojo sería mirar un
                        agujero negro — y lo que tiene que haber al otro lado es
                        una señal.
                    */}
                    <div className="wall-noise" />

                    {/*
                        ⚠ LA `key` NO ES UN ADORNO: ES EL RELOJ DEL OJO.

                        El arco tiene que empezar en cero cuando el hueco queda
                        a la vista, y la lluvia lleva corriendo desde mucho
                        antes. Poner el contador a cero desde un efecto es
                        justo lo que prohíbe la regla de los renders en
                        cascada; cambiar la `key` lo monta de nuevo, que es la
                        forma de la casa de decir «esto vuelve a empezar».
                    */}
                    <Estatica
                        key={fase === 'entera' || fase === 'cayendo' ? 'ruido' : 'ojo'}
                        arco={fase === 'abierto' || fase === 'fallando'}
                    />
                    <div className="wall-grain" />
                    <div className="wall-bands" />
                </div>

                {/*
                    Y el pedazo. Mientras esté puesto ES la pantalla; lo único
                    que lo delata es que esa zona glitchea de vez en cuando.
                */}
                {(fase === 'entera' || fase === 'cayendo') && (
                    <div
                        ref={trozo}
                        className={[
                            'loose-slab',
                            golpes > 0 ? 'loose-slab--suelto' : '',
                            fase === 'cayendo' ? 'loose-slab--cae' : '',
                        ]
                            .filter(Boolean)
                            .join(' ')}
                        style={
                            fase === 'cayendo' || golpes === 0
                                ? undefined
                                : ({
                                      /*
                                       * ⚠ CADA GOLPE LO DESPEGA UN POCO MÁS, y
                                       * por la rendija que deja empieza a
                                       * asomar lo de detrás. Es continuo a
                                       * propósito: con tres estados fijos, los
                                       * golpes de en medio no harían nada
                                       * visible y se dejaría de pegar.
                                       *
                                       * Gira sobre el canto de arriba, así que
                                       * lo que se abre es una CUÑA — que es
                                       * como se abre algo mal pegado, y no
                                       * como se abre una persiana.
                                       */
                                      transform: `rotate(${inclinacion * 9}deg) translate(${
                                          inclinacion * 10
                                      }px, ${inclinacion * 26}px)`,
                                      transition: 'transform 150ms ease-out',
                                  } as CSSProperties)
                        }
                    />
                )}
            </div>
        </>
    );
}

/**
 * Lo que hay detrás: estática, y en la estática un ojo.
 *
 * ⚠ UN OJO DE VERDAD, NO EL DIBUJO DE LA COLECCIÓN.
 *
 * La pieza en ASCII es lo que te LLEVÁS: un registro de lo que viste, hecho con
 * los caracteres del sistema, quieto porque una pieza que cambiara no se podría
 * coleccionar. Lo que hay detrás del agujero es otra cosa — es la cosa misma, y
 * tiene que moverse. Un dibujo de texto ahí se leería como una ilustración de lo
 * que pasó en vez de ser lo que está pasando.
 *
 * ⚠ Y PRIMERO NO HAY OJO. Mientras el pedazo sigue puesto, por la rendija que
 * dejan los golpes se ve lluvia y nada más. El ojo empieza a contar cuando el
 * hueco queda a la vista, y entonces SE RESUELVE del ruido — no aparece. Que lo
 * primero que se vea sea ruido vacío es lo que hace que llegar a algo tenga
 * peso.
 */
function Estatica({ arco }: { arco: boolean }) {
    const [frame, setFrame] = useState(0);
    const quieto = usePrefersReducedMotion();

    /*
     * ⚠ EL CONTADOR ARRANCA CUANDO SE VE EL HUECO, no cuando se monta la
     * escena.
     *
     * La lluvia lleva corriendo desde que hay algo suelto —se la ve por la
     * rendija de cada golpe— así que para cuando el pedazo caía el contador ya
     * iba por donde fuera y el ojo se encontraba a media mirada. Lo que pasa
     * antes de que se vea no le pasó a nadie: el arco empieza en cero, y quien
     * se encarga de eso es la `key` de arriba, que vuelve a montar esto.
     */
    useEffect(() => {
        if (quieto) return;

        const t = window.setInterval(() => setFrame((n) => n + 1), FRAME_MS);
        return () => window.clearInterval(t);
    }, [quieto]);

    /*
     * Sin el arco en marcha no hay ojo: sólo el campo hirviendo. Y con
     * movimiento reducido no hierve nada, así que se enseña el fotograma en que
     * te mira y se queda ahí.
     */
    const forma = arco
        ? eyeAt(quieto ? EYE_STILL_FRAME : frame)
        : { look: 0, lid: 1, presence: 0 };

    return (
        <pre className="wall-rain" aria-hidden="true">
            {rainFrame(forma)}
        </pre>
    );
}

/**
 * ⚠ LA CICATRIZ.
 *
 * La pantalla está de vuelta como si no hubiera pasado nada, pero esa zona
 * tiembla de vez en cuando. Nadie te lo cuenta y no se puede volver a tirar:
 * sólo vos sabés por qué pasa.
 *
 * Va sin contenido — es un temblor en el aire, no un elemento. Ponerle algo
 * dentro lo convertiría en un recordatorio, y un recordatorio es alguien
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
 *
 * Y con `prefers-reduced-motion` el final SE VE: no hay caída, ni lluvia
 * hirviendo, ni sacudida de tema — pero el ojo se enseña, te mira, y el sistema
 * se cae igual. Quien pide menos movimiento pide no marearse, no perderse el
 * remate.
 */
