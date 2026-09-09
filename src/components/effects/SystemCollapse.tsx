// src/components/effects/SystemCollapse.tsx
'use client';

import { BOOT_BARS } from '@/lib/system/boot';
import { useEffect, useRef, useState } from 'react';
import { resetIntegrity, registerRecovery } from '@/hooks/useSystemState';
import { LOCKOUT_MS } from '@/lib/system/collapseEscalation';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import AsciiStatic from '@/components/effects/AsciiStatic';
import { isV02 } from '@/lib/system/v02';
import { renderLoadingBar } from '@/lib/system/v02Loading';
import { fireGlitch } from '@/hooks/useGlitch';
import type { CollapseLevel } from '@/lib/system/collapseEscalation';

/**
 * El colapso del sistema. El clímax.
 *
 * Se dispara con la integridad a 0 (nueve clics en el rótulo) o con `//panic`.
 *
 * LO QUE MÁS IMPORTA NO SE VE: esto ocurre entero en una capa POR ENCIMA de la
 * app. Debajo, el editor sigue montado, el auto-guardado sigue su curso y el
 * foco NO se mueve — la capa lleva `pointer-events: none` y no enfoca nada, así
 * que se puede seguir escribiendo a ciegas y todo lo tecleado llega. Que se
 * pueda seguir escribiendo es la regla; el espectáculo es lo secundario.
 *
 * ESCALA SI INSISTÍS. Las tres primeras veces se reproduce igual. A partir de la
 * cuarta el rearranque tarda más y los fallos pegan más fuerte, y a la décima
 * seguida el sistema deja de volver solo: se queda una pantalla de error que
 * sólo se levanta resolviendo su puzzle o esperando cinco minutos
 * (ver `collapseEscalation` y `SystemLockout`).
 */

/** La secuencia previa al rearranque, en ms desde el disparo. */
const CUT_MS = 150; // corte a tinta plana
const STATIC_MS = 2200; // fin de la estática

/**
 * Las barras de color, entre la estática y el apagón.
 *
 * Es lo que hacía un televisor al perder la señal de verdad: primero nieve,
 * después la carta de ajuste, y sólo entonces se apagaba. Sin ellas, la estática
 * se apagaba a secas y el fallo parecía un corte de luz; con ellas, parece un
 * equipo que se rindió por su cuenta.
 *
 * Cortas a propósito: son un latido dentro de la caída, no una parada.
 */
const BARS_MS = 2200 + 520; // fin de las franjas
const DYING_MS = BARS_MS + 400; // fin del apagado del tubo

/** Con movimiento reducido: un corte a negro y el texto ya escrito. */
const REDUCED_MS = 400;

/**
 * Cada cuánto falla la PROPIA pantalla de carga, según la intensidad del nivel.
 *
 * Al principio no falla nada: el rearranque es una pantalla de carga y punto.
 * A partir del tercer colapso empiezan a caer tirones sueltos, y en el nivel más
 * alto la pantalla que debería estar arreglando el sistema falla ella misma sin
 * parar. Es la escalada contada donde más se nota — no en un número, sino en que
 * ni la pantalla de recuperación aguanta.
 *
 * `null` significa que no falla.
 */
const FAILURE_CADENCE_MS: Record<number, number | null> = {
    1: null,
    1.5: 4200,
    2: 2100,
    3: 900,
};

type Phase =
    | 'cut'
    | 'static'
    | 'bars'
    | 'dying'
    | 'reboot'
    | 'stalled'
    /**
     * v0.2 · SE RINDIÓ, Y NO VA A VOLVER SOLA.
     *
     * ⚠ NO ES EL BLOQUEO CON OTRO NOMBRE. El bloqueo es la máquina echándote:
     * decidió que no entrás. Esto es al revés — la máquina QUIERE volver y no
     * sabe cómo, porque la rutina que la levanta no se había escrito todavía.
     * Se queda encendida, con el error puesto, esperando a que alguien le dé al
     * interruptor.
     */
    | 'halted';

/**
 * LO QUE HAY QUE ESCRIBIR PARA LEVANTARLA, en la v0.2.
 *
 * ⚠ ES EL EQUIVALENTE DEL PUZZLE DEL BLOQUEO, y por eso es UNA palabra y está
 * escrita en la pantalla. El de la 1.0 te hace resolver algo porque esa máquina
 * decidió echarte y quiere ver si merecés volver; ésta no decidió nada — se
 * paró—, así que no hay nada que merecer: hay que darle la orden a mano, que es
 * lo único que sabe entender cuando ya no le queda sistema.
 *
 * Se acepta con o sin las barras del prefijo: quien lleva media partida
 * tecleando `//reboot` va a escribirlo con ellas, y castigar eso sería castigar
 * haber aprendido cómo funciona la casa.
 */
const HALT_WORD = /^\s*(?:\/\/)?\s*reboot\s*$/i;

/**
 * Y cuánto aguanta si nadie escribe nada.
 *
 * ⚠ SON LOS MISMOS CINCO MINUTOS DEL BLOQUEO, a propósito: es el mismo castigo
 * contado por la otra máquina. Allá te echa y esperás; acá se detiene y esperás.
 *
 * Lo que la levanta al final NO es que el sistema se recupere —esa rutina es
 * justamente la que no existe en esta versión— sino el temporizador de guarda,
 * que es una pieza del aparato y no del programa: cuando nadie contesta, corta
 * la corriente y la vuelve a dar. Los equipos de entonces los llevaban, y es lo
 * único que puede levantar una máquina que ya no sabe levantarse.
 */
const HALT_WATCHDOG_MS = LOCKOUT_MS;

/** Dónde se traba la barra cuando el sistema ya no va a volver. */
const STALL_MIN = 0.52;
const STALL_SPREAD = 0.31;

/** Cuánto se queda la barra congelada antes de admitir el fallo. */
const STALL_HOLD_MS = 1600;

/** Y cuánto dura el mensaje de fallo antes de ceder a la pantalla de error. */
const STALL_ERROR_MS = 1400;

interface SystemCollapseProps {
    /**
     * Apagar y encender de verdad, que es lo único que levanta la v0.2.
     *
     * ⚠ NO ES `onDone`. Aquél dice «el sistema se recuperó»: la app vuelve por
     * donde estaba y el arranque entra desde las barras. Esto es el
     * INTERRUPTOR — reinicia la máquina entera, igual que el botón del panel y
     * que `//reboot`, porque acá no hay ninguna recuperación que anunciar.
     */
    onManualReboot?: () => void;
    /** Cuántas notas tenés. El rearranque las cuenta de verdad. */
    notesCount: number;
    /**
     * Con qué fuerza toca reproducirlo.
     *
     * Lo calcula QUIEN DISPARA el colapso, no este componente: `registerCollapse`
     * muta el almacén, y llamarlo desde el render —aunque fuera en un
     * inicializador perezoso— lo dejaría a merced de cuántas veces React decida
     * renderizar. En un manejador de evento, en cambio, ocurre exactamente una
     * vez por colapso.
     */
    level: CollapseLevel;
    onDone: () => void;
}

/**
 * Las líneas del rearranque, cada una con el punto de la barra en que aparece.
 *
 * NO salen todas de golpe: van saliendo A MEDIDA QUE CARGA. Con las tres puestas
 * desde el primer fotograma, la barra era decorativa — ya sabías el final antes
 * de que empezara. Apareciendo por etapas, la barra cuenta algo: cada tramo que
 * avanza recupera una pieza más.
 *
 * Y la última es la que importa: que la máquina te diga que tus notas están
 * enteras JUSTO AL FINAL, después de haberte hecho esperar, es lo que hace que
 * el chiste no dé miedo.
 */
function rebootLines(notesCount: number): { at: number; text: string }[] {
    return [
        { at: 0.05, text: '> REINICIANDO NÚCLEO...' },
        { at: 0.32, text: '> VERIFICANDO MEMORIA...' },
        { at: 0.58, text: '> MEMORIA: OK' },
        { at: 0.78, text: '> RECUPERANDO ARCHIVOS...' },
        { at: 0.95, text: `> NOTAS: ${notesCount} RECUPERADAS` },
    ];
}

/**
 * Y las del rearranque que no llega.
 *
 * Empiezan igual y se van torciendo: la máquina intenta lo mismo de siempre y
 * cada paso le sale peor. Es más incómodo que un error de golpe, porque durante
 * los primeros dos tramos parece que va a salir bien.
 */
function failingLines(): { at: number; text: string }[] {
    return [
        { at: 0.05, text: '> REINICIANDO NÚCLEO...' },
        { at: 0.3, text: '> VERIFICANDO MEMORIA...' },
        { at: 0.52, text: '> MEMORIA: ERROR DE PARIDAD' },
        { at: 0.7, text: '> REINTENTANDO...' },
        { at: 0.85, text: '> REINTENTANDO...' },
    ];
}

/**
 * Y las de la v0.2, que ni siquiera lo intenta hasta el final.
 *
 * ⚠ LA ÚLTIMA LÍNEA ES LA QUE CUENTA TODO: `SIN RUTINA DE RECUPERACIÓN`. Esta
 * versión no está más rota que la otra — le falta un trozo que todavía no se
 * había escrito. Es la misma diferencia que en los comandos: lo que no existe
 * ahí no existe porque nadie lo escribió, no porque se rompiera.
 *
 * Y la de después dice qué hacer. Una pantalla que se queda quieta sin decir
 * cómo salir no es un personaje, es un cuelgue — la pantalla de perdido del
 * pong ya enseñó esa lección: una salida que no se ve, no está (REGLAS · A4).
 */
function haltedLines(): { at: number; text: string }[] {
    return [
        { at: 0.05, text: '> REINICIANDO NUCLEO...' },
        { at: 0.3, text: '> VERIFICANDO MEMORIA...' },
        { at: 0.52, text: '> MEMORIA: ERROR DE PARIDAD' },
        { at: 0.7, text: '> REINTENTANDO...' },
        { at: 0.86, text: '> SIN RUTINA DE RECUPERACION' },
    ];
}

export default function SystemCollapse({
    notesCount,
    level,
    onDone,
    onManualReboot,
}: SystemCollapseProps) {
    const reducedMotion = usePrefersReducedMotion();
    const [phase, setPhase] = useState<Phase>(reducedMotion ? 'reboot' : 'cut');
    // Con movimiento reducido no hay barra que mirar, así que las líneas salen
    // enteras desde el principio.
    const [progress, setProgress] = useState(reducedMotion ? 1 : 0);

    /*
     * ⚠ `onDone` VA POR REF, Y ESTO ARREGLA UN FALLO REPORTADO JUGANDO: «la
     * barra que sube de reiniciar se queda pegada».
     *
     * Estaba en las dependencias del efecto de la barra, y el padre le pasa una
     * función NUEVA en cada render — la página repinta sola, con el reloj de la
     * barra de estado. Cada repintado desarmaba el intervalo y volvía a poner
     * `inicio = Date.now()`: la barra empezaba de cero una y otra vez y no
     * llegaba nunca al final.
     *
     * Con el bloqueo no se notaba, porque ahí la barra SE TIENE que trabar. Por
     * eso el informe decía exactamente eso: «es bueno cuando están en el error
     * pero no cuando se reinicia».
     *
     * Es el mismo fallo que `BootPrompt` ya tenía documentado, con las mismas
     * palabras. La segunda vez que aparece deja de ser mala suerte.
     */
    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    }, [onDone]);

    /*
     * ⚠ SE LEE UNA VEZ Y SIN SUSCRIBIRSE, como en el arranque: nadie salta de
     * versión con el sistema colapsado encima.
     */
    const v02 = isV02();

    /**
     * LA v0.2 NO SABE VOLVER SOLA.
     *
     * En la 1.0 el colapso es un susto con final feliz: la máquina se apaga,
     * arranca y te devuelve tus notas. Ahí la rutina de recuperación existe.
     *
     * ⚠ Y NO ES QUE ESTÉ MÁS ROTA: es que ese trozo no se había escrito. Es la
     * misma regla que gobierna sus comandos — lo que no está ahí no está porque
     * nadie lo escribió todavía.
     *
     * El bloqueo sigue mandando por encima: si la escalada decidió echarte, te
     * echa igual, y eso no es cosa de la versión.
     */
    const seDetiene = v02;

    const lineas = seDetiene
        ? haltedLines()
        : level.lockout
          ? failingLines()
          : rebootLines(notesCount);

    /** Lo tecleado en la consola de emergencia, y lo que contestó. */
    const [orden, setOrden] = useState('');
    const [replica, setReplica] = useState('');

    /*
     * ⚠ EL INTERRUPTOR VA POR REF, por lo mismo que `onDone`: el padre le pasa
     * una función nueva en cada render y la página repinta sola una vez por
     * segundo. Con la función en las dependencias, el temporizador de guarda se
     * rearmaba en cada repintado y no vencía NUNCA — el mismo fallo que ya
     * apareció cuatro veces en esta casa.
     */
    const rebootRef = useRef(onManualReboot);
    useEffect(() => {
        rebootRef.current = onManualReboot;
    }, [onManualReboot]);

    /** El temporizador de guarda: si nadie contesta, corta y vuelve a dar. */
    useEffect(() => {
        if (phase !== 'halted') return;

        const id = setTimeout(() => rebootRef.current?.(), HALT_WATCHDOG_MS);
        return () => clearTimeout(id);
    }, [phase]);

    // La secuencia hasta el rearranque.
    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = [];
        const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

        if (reducedMotion && seDetiene) {
            /*
             * Con movimiento reducido se llega igual al final, sin el camino:
             * quien pide menos movimiento pide no marearse, no perderse lo que
             * pasa (REGLAS · A3). Y lo que pasa acá es que la máquina se
             * detuvo.
             */
            at(REDUCED_MS, () => setPhase('halted'));
        } else if (reducedMotion) {
            at(REDUCED_MS, () => {
                registerRecovery();
                onDone();
            });
        } else if (seDetiene) {
            /*
             * ⚠ Y SIN LAS BARRAS DE COLOR. Esta versión no tiene carta de
             * ajuste que enseñar — igual que su arranque, que pone estática
             * donde la otra pone barras. El tramo se le da a la estática, que
             * es lo único que sabe emitir.
             */
            at(CUT_MS, () => setPhase('static'));
            at(BARS_MS, () => setPhase('dying'));
            at(DYING_MS, () => setPhase('reboot'));
            at(DYING_MS + STALL_HOLD_MS, () => setPhase('halted'));

            /*
             * ⚠ Y ACÁ NO HAY `onDone`. En las otras dos ramas el colapso
             * termina y devuelve el control; ésta se queda puesta. No es un
             * olvido: es el suceso. Sale con el interruptor de abajo o con
             * `//reboot`, que en esta versión existe justamente porque apagar y
             * encender es lo más viejo que sabe hacer un equipo.
             */
        } else if (level.lockout) {
            // El rearranque ARRANCA y se traba. Saltárselo era peor: la barra
            // que empieza a subir y se queda clavada cuenta el fallo mucho mejor
            // que no intentarlo — primero te hace creer que vuelve.
            at(CUT_MS, () => setPhase('static'));
            at(STATIC_MS, () => setPhase('bars'));
            at(BARS_MS, () => setPhase('dying'));
            at(DYING_MS, () => setPhase('reboot'));
            at(DYING_MS + STALL_HOLD_MS, () => setPhase('stalled'));
            at(DYING_MS + STALL_HOLD_MS + STALL_ERROR_MS, onDone);
        } else {
            at(CUT_MS, () => setPhase('static'));
            at(STATIC_MS, () => setPhase('bars'));
            at(BARS_MS, () => setPhase('dying'));
            at(DYING_MS, () => setPhase('reboot'));
        }

        /*
         * SE MARCA EN `<html>`, como la avería cromática y la v0.2.
         *
         * Las capas de glitch y el barrido viven fuera de este árbol, y tienen
         * que saber que hay un colapso encima para subirse por arriba y para
         * pintarse con luz en vez de con tinta. Un atributo en la raíz es el
         * único sitio desde el que se alcanza todo, y ya es el patrón de la
         * casa para esto.
         */
        document.documentElement.setAttribute('data-collapsing', '');

        return () => {
            document.documentElement.removeAttribute('data-collapsing');
            timers.forEach(clearTimeout);
        };
        // Se arma una sola vez: la secuencia es fija desde que empieza.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * El rearranque, con su barra.
     *
     * Tarda entre diez y cuarenta segundos, y más cuanto más hayas insistido.
     * La barra no es decoración: sin ella, medio minuto de pantalla negra se lee
     * como que la app se colgó. Con ella, se lee como que está trabajando.
     */
    useEffect(() => {
        if (phase !== 'reboot' || reducedMotion) return;

        // Con el bloqueo, la barra sube deprisa hasta donde se va a trabar y ahí
        // se queda: el tope se sortea para que no siempre falle en el mismo
        // punto, que es lo que delataría que estaba guionado.
        const seTraba = level.lockout || seDetiene;
        const tope = seTraba ? STALL_MIN + Math.random() * STALL_SPREAD : 1;
        const duracion = seTraba ? STALL_HOLD_MS : level.rebootMs;

        const inicio = Date.now();
        const id = setInterval(() => {
            const t = Math.min(tope, ((Date.now() - inicio) / duracion) * tope);
            setProgress(t);
            if (!seTraba && t >= 1) {
                clearInterval(id);
                resetIntegrity();
                // La ventana de la escalada empieza a correr ACÁ, cuando el
                // sistema volvió — no cuando se rompió.
                registerRecovery();
                onDoneRef.current();
            }
        }, 100);

        return () => clearInterval(id);
        // ⚠ `onDone` NO va acá: ver el ref de arriba. Entra por referencia
        // justamente para que un padre que repinta no reinicie la barra.
    }, [phase, reducedMotion, level.rebootMs, level.lockout, seDetiene]);

    /**
     * La pantalla de carga que también falla.
     *
     * A más colapsos encima, más seguido. En el nivel crítico cae casi cada
     * segundo: la pantalla que debería estar recuperando el sistema no consigue
     * ni sostenerse a sí misma.
     */
    useEffect(() => {
        if (reducedMotion) return;
        if (phase !== 'reboot' && phase !== 'stalled' && phase !== 'halted') return;

        const cada = FAILURE_CADENCE_MS[level.intensity] ?? null;
        if (cada === null) return;

        const id = setInterval(() => fireGlitch(), cada);
        return () => clearInterval(id);
    }, [phase, reducedMotion, level.intensity]);


    const segundosRestantes = Math.ceil((level.rebootMs * (1 - progress)) / 1000);

    return (
        <div
            className="collapse-layer"
            data-phase={phase}
            data-intensity={level.intensity}
            /*
                ⚠ DETENIDA DEJA DE ESTAR OCULTA, y no es un detalle de más. Todo
                el colapso es decorado —por eso va `aria-hidden` y no recibe
                puntero: debajo se sigue escribiendo a ciegas— pero la pantalla
                detenida NO es decorado: es lo único que hay, y la única salida
                es teclear una palabra en ella. Un control enfocable dentro de un
                subárbol oculto no existe para quien usa lector de pantalla, así
                que la salida tampoco existiría.
            */
            aria-hidden={phase === 'halted' ? undefined : true}
            style={{ pointerEvents: 'none' }}
        >
            {phase === 'static' && (
                <>
                    <AsciiStatic className="collapse-noise mono" />
                    <div className="collapse-drag" />
                    <div className="collapse-drag is-second" />
                </>
            )}

            {/* Las franjas, entre la nieve y el apagón: es lo que hacía un
                televisor al perder la señal de verdad. */}
            {phase === 'bars' && (
                <div className="collapse-bars" aria-hidden="true">
                    {BOOT_BARS.map((c) => (
                        <span key={c} style={{ background: c }} />
                    ))}
                </div>
            )}

            {phase === 'dying' && <div className="collapse-dying" />}

            {/*
                ⚠ Y DETENIDA SIGUE HABIENDO SEÑAL ROTA DETRÁS. En la 1.0 el
                rearranque se ve sobre negro, porque ahí la máquina está
                trabajando y lo que hay que mirar es la barra. Acá no trabaja
                nada: la pantalla se quedó a medio caer, con la basura todavía
                puesta y las barras de arrastre bajando por encima.

                Son las MISMAS capas de la fase de estática, no unas nuevas: lo
                que cambia es que ahí eran el principio de la caída y acá son lo
                que quedó.
            */}
            {phase === 'halted' && (
                <>
                    <AsciiStatic className="collapse-noise mono" />
                    <div className="collapse-drag" aria-hidden="true" />
                    <div className="collapse-drag is-second" aria-hidden="true" />
                </>
            )}

            {(phase === 'reboot' || phase === 'stalled' || phase === 'halted') && (
                /*
                    ⚠ LA PANTALLA DETENIDA LLEVA OTRA MARCA, Y ES POR EL SONIDO.
                    `.collapse-reboot` es la máquina LEYENDO para volver: trae el
                    cabezal y lo repite cada segundo y medio mientras la marca
                    esté puesta. Una máquina que se rindió no está leyendo nada,
                    y con la clase compartida el disco habría seguido buscando
                    para siempre por debajo de un sistema detenido.

                    El estilo es el mismo —se comparte por CSS—; lo que cambia
                    es qué está pasando.
                */
                <div
                    className={
                        phase === 'halted' ? 'collapse-halted mono' : 'collapse-reboot mono'
                    }
                >
                    {/*
                        ⚠ DETENIDA, SALEN TODAS. Mientras la barra sube, cada
                        línea aparece cuando le toca —así se lee como algo que
                        está pasando—, pero la barra de la v0.2 se TRABA en un
                        punto sorteado entre el 52 % y el 83 %, y las últimas
                        quedaban colgando de un umbral al que no llegaba nunca:
                        la línea que explica por qué no vuelve no se veía. Cuando
                        la máquina para, termina de escribir.
                    */}
                    <pre className="collapse-reboot-lines">
                        {lineas
                            .filter((l) => phase === 'halted' || progress >= l.at)
                            .map((l) => l.text)
                            .join('\n')}
                    </pre>

                    {/* La barra usa el mismo vocabulario ASCII que el medidor de
                        la barra de estado: bloques llenos y vacíos. Es la app
                        contándote algo con sus propios caracteres, no un widget
                        de otra familia.

                        ⚠ Y LA v0.2 USA LA SUYA, que es la de 40 columnas con
                        almohadillas y puntos: la misma que enseña cargando la
                        lista y encendiéndose. Los bloques `▮▯` no están en la
                        monoespaciada de la casa —los pinta una fuente de
                        reserva— y esa versión, que va de anterior, no iba a
                        estrenar el carácter más moderno de las dos. */}
                    {seDetiene ? (
                        <p className="collapse-progress v02-load">
                            {renderLoadingBar(Math.round(progress * 100))}
                        </p>
                    ) : (
                        <p className="collapse-progress">
                            [{'▮'.repeat(Math.round(progress * 24))}
                            {'▯'.repeat(24 - Math.round(progress * 24))}]{' '}
                            {Math.round(progress * 100)}%
                        </p>
                    )}

                    {phase === 'halted' ? (
                        /*
                         * ⚠ DICE CÓMO SALIR, y eso no es una concesión: una
                         * pantalla que se queda quieta sin decir qué hacer no se
                         * lee como una máquina detenida, se lee como que la app
                         * se colgó. Es la lección de la pantalla de perdido del
                         * pong, escrita otra vez.
                         */
                        <>
                            <p className="collapse-failed">
                                &gt; DETENIDO
                                <br />
                                &gt; REINICIE A MANO: ESCRIBA REBOOT
                            </p>

                            {/*
                                LA CONSOLA DE EMERGENCIA.

                                ⚠ ES LO ÚNICO DE TODO EL COLAPSO QUE RECIBE EL
                                PUNTERO Y EL FOCO. La capa entera va con
                                `pointer-events: none` para que debajo se pueda
                                seguir escribiendo a ciegas; acá no hay «debajo»
                                que valga — la máquina está parada, y lo único
                                que queda por hacer es darle la orden.

                                ⚠ Y ES UN FORMULARIO DE VERDAD, con su `label`
                                escondida y su `autoFocus`: la salida tiene que
                                poder usarse con el teclado y anunciarse a un
                                lector de pantalla. Una salida que no se ve —o
                                que no se oye— no está (REGLAS · A4).
                            */}
                            <form
                                className="collapse-console"
                                style={{ pointerEvents: 'auto' }}
                                onSubmit={(e) => {
                                    e.preventDefault();

                                    if (HALT_WORD.test(orden)) {
                                        onManualReboot?.();
                                        return;
                                    }

                                    /*
                                     * Contesta como contestaría ella: no sabe
                                     * qué es eso. Sin la réplica, teclear algo
                                     * y no ver nada se lee como que el teclado
                                     * tampoco funciona — y entonces la pantalla
                                     * pasa de detenida a rota.
                                     */
                                    setReplica(orden.trim() ? 'ORDEN NO RECONOCIDA' : '');
                                    setOrden('');
                                }}
                            >
                                <label className="sr-only" htmlFor="collapse-console">
                                    Escriba reboot para reiniciar el sistema
                                </label>
                                <span aria-hidden="true">&gt;</span>
                                <input
                                    id="collapse-console"
                                    className="collapse-console-input"
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck={false}
                                    value={orden}
                                    onChange={(e) => setOrden(e.target.value)}
                                />
                            </form>

                            {replica && (
                                <p className="collapse-failed" role="status">
                                    &gt; {replica}
                                </p>
                            )}
                        </>
                    ) : phase === 'stalled' ? (
                        <p className="collapse-failed">
                            &gt; FALLO EN LA VERIFICACIÓN DE MEMORIA
                            <br />
                            &gt; EL NÚCLEO NO RESPONDE
                        </p>
                    ) : (
                        <p className="collapse-eta">
                            {level.lockout
                                ? 'TIEMPO ESTIMADO: --'
                                : `TIEMPO ESTIMADO: ${segundosRestantes}s`}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
