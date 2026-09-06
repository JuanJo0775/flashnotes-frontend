// src/components/effects/LooseWall.tsx
'use client';

import type { CSSProperties } from 'react';
import {
    useCallback,
    useEffect,
    useState,
    useSyncExternalStore,
} from 'react';
import { HITS_TO_FALL, hitWall, wallLean } from '@/lib/system/looseWall';
import { hasScar, helpedHim, somethingLoose } from '@/lib/system/entityEnding';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { ChromaSplitFilters } from '@/components/effects/ChromaticFailure';
import { eyeAt, FRAME_MS, rainFrame } from '@/lib/system/eyeStatic';

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
 * Por eso el pedazo es un rectángulo opaco pintado del MISMO color que la
 * página. Mientras está en su sitio no se ve, porque es la pantalla. Sólo
 * cuando se mueve empieza a asomar lo que tapaba.
 *
 * ⚠ CLICS COMO GOLPES, NO COMO INTERFAZ. No hay botón, no hay foco, no hay
 * cursor de mano y no hay contador: cada golpe lo despega más y eso se ve, que
 * es la única forma de que alguien siga pegando sin que nadie se lo pida. Es lo
 * único de toda la app que responde al clic sin ser un control.
 *
 * Ver la nota de accesibilidad al final del fichero.
 */

/** Cuánto tarda el pedazo en desprenderse del todo, en milisegundos. */
const CAIDA_MS = 1600;

/**
 * Cuánto te mira antes de cerrarse.
 *
 * Tiene que dar tiempo a que lo veas moverse: si se cerrara enseguida sería un
 * parpadeo, y lo que hay que entender es que estuvo mirándote un rato.
 */
const MIRA_MS = 4200;

/** Y lo que tarda en cerrarse del todo, antes de que falle el sistema. */
const CIERRE_MS = 1100;

type Fase = 'entera' | 'cayendo' | 'abierto' | 'cerrando' | 'nada';

/** Esto no cambia solo: se mira una vez al montar y ya. */
const SIN_CAMBIOS = () => () => {};

export function LooseWall() {
    const [golpes, setGolpes] = useState(0);
    const [fase, setFase] = useState<Fase>('entera');
    const quieto = usePrefersReducedMotion();

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

    /*
     * ⚠ CADA GOLPE SACUDE LA PANTALLA CON EL FALLO CROMÁTICO. EL DE VERDAD.
     *
     * No un efecto parecido: los mismos `@keyframes` que la avería de la señal
     * (§14), sobre el `body`. Inventar uno propio para esto diría que es otra
     * clase de avería, y es la misma — el sitio se rompe de una sola manera.
     *
     * Y si sólo se moviera el pedazo, se leería como arrastrar una ficha. Que
     * se resienta todo lo demás es lo que lo convierte en pegarle a la
     * superficie donde vive todo.
     */
    const pegar = useCallback(() => {
        const van = hitWall();
        setGolpes(van);

        document.body.classList.add('is-blow');
        window.setTimeout(() => document.body.classList.remove('is-blow'), 240);

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
        setFase('cayendo');

        // Cae el pedazo, y por el hueco aparece lo que había detrás.
        window.setTimeout(() => setFase('abierto'), quieto ? 0 : CAIDA_MS);

        /*
         * ⚠ Y AL FINAL SE CIERRA. Eso es el remate, no un temporizador.
         *
         * Te mira un rato —el iris se mueve, se queda, mira a otro lado— y
         * después cierra el ojo. Que el último gesto sea suyo y no del reloj es
         * lo que convierte el momento en una despedida en vez de en una escena
         * que se acaba porque sí.
         */
        window.setTimeout(
            () => setFase('cerrando'),
            quieto ? 0 : CAIDA_MS + MIRA_MS
        );

        window.setTimeout(
            () => {
                /*
                 * ⚠ LA PIEZA SE DA ACÁ, con el hueco todavía abierto.
                 *
                 * `helpedHim()` lo pone en `ido`, da el ojo y deja la pantalla
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
            quieto ? 0 : CAIDA_MS + MIRA_MS + CIERRE_MS
        );
    }, [quieto]);

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

            <div aria-hidden="true" className="loose-zone">
                {/*
                    El hueco: lo que hay detrás de la pantalla, esperando.

                    ⚠ SE ABRE CON LOS GOLPES. `--peel` va de 0 a 1 y el recorte
                    lo convierte en una franja que crece desde arriba, como una
                    lámina que se levanta por el canto. Antes el hueco estaba
                    entero desde el principio y lo tapaba un rectángulo pintado
                    — y por bien que se eligiera ese color, se notaba.
                */}
                <div className="loose-hole">
                    <Estatica cerrando={fase === 'cerrando'} />
                </div>

                {/*
                    Y el pedazo. ⚠ NO PINTA NADA: es transparente y sólo recibe
                    los golpes. Lo que se ve es el hueco abriéndose detrás, no
                    una lámina moviéndose encima.
                */}
                {(fase === 'entera' || fase === 'cayendo') && (
                    <div
                        className={`loose-slab${
                            fase === 'cayendo' ? ' loose-slab--cae' : ''
                        }`}
                        onMouseDown={fase === 'entera' ? pegar : undefined}
                        style={
                            fase === 'cayendo'
                                ? undefined
                                : ({
                                      /*
                                       * Cada golpe lo despega un poco más, y
                                       * por la rendija que deja empieza a
                                       * asomar lo de detrás. Es continuo a
                                       * propósito: con tres estados fijos, los
                                       * golpes de en medio no harían nada
                                       * visible y se dejaría de pegar.
                                       */
                                      transform: `rotate(${inclinacion * 6}deg) translate(${
                                          inclinacion * 8
                                      }px, ${inclinacion * 14}px)`,
                                      transition: quieto
                                          ? 'none'
                                          : 'transform 150ms ease-out',
                                      animation: golpes > 0 ? 'none' : undefined,
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
 * Todo es SVG y CSS: el grano sale de `feTurbulence` con la semilla animada, no
 * de una imagen. Nada que descargar y nada que se vea borroso al ampliar.
 */
function Estatica({ cerrando }: { cerrando: boolean }) {
    const [frame, setFrame] = useState(0);
    const quieto = usePrefersReducedMotion();

    useEffect(() => {
        if (quieto) return;

        const t = window.setInterval(() => setFrame((n) => n + 1), FRAME_MS);
        return () => window.clearInterval(t);
    }, [quieto]);

    /*
     * ⚠ EL CIERRE CUENTA SUS PROPIOS FOTOGRAMAS.
     *
     * Si usara el contador general, el ojo se cerraría desde donde estuviera el
     * ciclo en ese momento — a veces de golpe, a veces a medias. El final tiene
     * que ser siempre el mismo: baja, y se queda abajo.
     */
    const [desde, setDesde] = useState(0);
    useEffect(() => {
        if (cerrando) setDesde(frame);
        // La dependencia es sólo `cerrando`: se marca el instante en que
        // empieza, no cada fotograma.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cerrando]);

    const forma = eyeAt(cerrando ? frame - desde : frame, cerrando);

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
 */
