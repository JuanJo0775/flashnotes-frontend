// src/components/system/Banco.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { KEY_LAYERS, key as voiceKey, type KeyLayer } from '@/lib/system/audio/voices';
import { ensureAudio, setSoundOn, teardownAudio } from '@/lib/system/audio/context';
import { PEAK_DBFS } from '@/lib/system/audio/mix';
import { play, type VoiceName } from '@/lib/system/audio/play';
import { EVENT_SOUNDS, INTERNAL_VOICES } from '@/lib/system/audio/events';
import { SCREEN_SOUNDS, fire } from '@/lib/system/audio/screens';
import { useSound } from '@/hooks/useSound';
import { useTheme, toggleTheme } from '@/hooks/useTheme';
import { ART, ART_FACES, ART_TOTAL } from '@/lib/system/asciiArt';
import EffectViewer from '@/components/system/EffectViewer';
import ScreenViewer from '@/components/system/ScreenViewer';
import {
    SYSTEM_SCREENS,
    SYSTEM_SCREENS_TOTAL,
    type SystemScreen,
} from '@/lib/system/screensCatalog';
import { COLOR_TOKENS, FONT_TOKENS, SYSTEM_ICONS, TEXT_TOKENS } from '@/lib/system/identity';
import MetaTag from '@/components/ui/MetaTag';
import ProgressBar from '@/components/ui/ProgressBar';
import {
    VISUAL_EFFECTS_TOTAL,
    effectsOf,
    type EffectSheet,
    type VisualEffect,
} from '@/lib/system/effectsCatalog';

/**
 * LA PÁGINA DE IDENTIDAD DEL SISTEMA. Todo lo que existe, con su nombre.
 *
 * ⚠ NO EXISTE EN PRODUCCIÓN, y no es por peso: esto enseña de golpe el
 * repertorio completo de averías, y la mitad son cosas que hay que GANARSE
 * jugando. Publicarlo sería repartir las respuestas.
 *
 * Tres motivos, los tres salidos de usar el proyecto:
 *
 *  1 · NO HABÍA FORMA DE VER UN EFECTO A VOLUNTAD. El fallo cromático se gana
 *      insistiendo diez veces con el interruptor de tema; el colapso hay que
 *      provocarlo; la pared hay que romperla. Comprobar que algo se ve bien en
 *      los dos temas costaba una partida entera — y el contrato de diseño pide
 *      mirarlo en los dos, no suponerlo.
 *  2 · NO HABÍA FORMA DE OÍR UN SONIDO SUELTO. Dentro de la app llega mezclado
 *      con otros diez y con la compuerta recortando.
 *  3 · LOS MATERIALES SÓLO ESTABAN EN PROSA. `DISENO.md` los describe en una
 *      tabla escrita a mano, y una tabla a mano envejece.
 *
 * ⚠ Y NADA DE ESTO SE COPIA. Los colores se leen del tema activo con
 * `getComputedStyle`, los dibujos salen de `asciiArt`, los efectos de
 * `effectsCatalog` y los sonidos de `voices`. Todas esas listas tienen un test
 * que las ata a su fuente: esta página no puede envejecer sin que la suite lo
 * diga, que es la única diferencia entre documentación y adorno.
 */

/**
 * Una fila del catálogo: el suceso, la voz que lo dice, y el botón para oírlo.
 *
 * ⚠ EL BOTÓN NO ES UN LUJO. Una tabla que sólo se lee obliga a creerse que la
 * fila dice la verdad; una que se puede disparar la comprueba sola. Es la misma
 * razón por la que esta página existe: dentro de la app cada sonido llega
 * mezclado con otros diez y con la compuerta recortando.
 */
function Fila({
    suceso,
    voz,
    donde,
    pendiente,
    onOir,
}: {
    suceso: string;
    voz: string;
    donde: string;
    pendiente?: boolean;
    onOir?: () => void;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '0.75rem',
                flexWrap: 'wrap',
            }}
        >
            <button
                type="button"
                className="btn-terminal"
                disabled={!onOir}
                onClick={onOir}
                style={{ minWidth: '7.5rem', opacity: onOir ? 1 : 0.45 }}
            >
                [{voz.toUpperCase()}]
            </button>
            <span style={{ flex: '1 1 16rem', minWidth: '12rem' }}>{suceso}</span>
            <span className="comment">
                {donde}
                {/* Lo pendiente se declara en vez de omitirse: omitirlo lo haría
                    parecer inexistente, y quien buscara por qué no suena no
                    encontraría ni el hueco. */}
                {pendiente ? ' · SIN ENCHUFAR' : ''}
            </span>
        </div>
    );
}

/** Las voces que se disparan tal cual, sin argumentos. */
const SUELTAS: { name: VoiceName; label: string; nota: string }[] = [
    { name: 'key', label: 'TECLA', nota: 'tres capas · lo que más va a sonar' },
    { name: 'tick', label: 'TIC', nota: 'teletipo · una por línea, nunca por carácter' },
    { name: 'relay', label: 'RELE', nota: 'dos chasquidos · la armadura rebota' },
];

const TITULO_HOJA: Record<EffectSheet, string> = {
    animations: 'Ambiental · lo que siempre está',
    glitch: 'Avería · el fallo, en todas sus formas',
    v02: 'v0.2 · la versión vieja',
};

/**
 * El valor que un token tiene AHORA MISMO, leído del tema activo.
 *
 * ⚠ NO SE COPIA NINGÚN HEX. Un catálogo de color con los valores escritos a mano
 * empieza a mentir en cuanto alguien retoca uno, y encima no sabría enseñar el
 * tema oscuro: los valores viven en `globals.css` y sólo el navegador sabe cuál
 * gana.
 *
 * Se lee en la referencia y no en un efecto con `setState`: guardar en estado
 * algo que ya está en el DOM es duplicarlo, y React lo rechaza con razón. La
 * fila entera se remonta al cambiar de tema —lleva el tema en su `key`— y con
 * eso vuelve a leer.
 */
function Valor({ token }: { token: string }) {
    return (
        <span
            className="diag-value tabular-nums"
            style={{ minWidth: '9rem' }}
            ref={(el) => {
                if (!el) return;
                el.textContent = getComputedStyle(document.documentElement)
                    .getPropertyValue(`--${token}`)
                    .trim();
            }}
        />
    );
}

/** Un filete de puntos, el mismo que separa nombre de dato en las listas. */
function Guia() {
    return <span className="file-row-leader" aria-hidden="true" />;
}

/** Un bloque del catálogo, con su regla y su respiro. */
function Seccion({
    titulo,
    nota,
    children,
}: {
    titulo: string;
    nota?: string;
    children: React.ReactNode;
}) {
    return (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
                <h2 className="section-header">{titulo}</h2>
                {nota && <p className="comment">{nota}</p>}
            </div>
            {children}
        </section>
    );
}

export default function Banco() {
    const [despierto, setDespierto] = useState(false);
    // Del almacén y no de un estado local: el interruptor se toca también desde
    // el panel y desde `//sound`, y leerlo al pintar violaría C1.
    const encendido = useSound();
    const tema = useTheme();
    const [sala, setSala] = useState(50);
    const [temblor, setTemblor] = useState(6);
    const [capas, setCapas] = useState<readonly KeyLayer[]>(KEY_LAYERS);
    const [ultimo, setUltimo] = useState('—');
    const [mirando, setMirando] = useState<VisualEffect | null>(null);
    const [pantalla, setPantalla] = useState<SystemScreen | null>(null);

    // Al salir del banco no tiene por qué quedar un contexto abierto.
    useEffect(() => () => teardownAudio(), []);

    /** Despierta el audio. Sólo puede pasar dentro de un gesto de verdad. */
    const despertar = useCallback(() => {
        const g = ensureAudio();
        setDespierto(g !== null);
        if (g) g.room.gain.value = sala / 100;
    }, [sala]);

    const disparar = useCallback(
        (fn: () => void, nombre: string) => {
            despertar();
            fn();
            setUltimo(nombre);
        },
        [despertar]
    );

    /** La sala se mueve en caliente: es la comparación que importa oír. */
    useEffect(() => {
        const g = ensureAudio();
        if (g) g.room.gain.value = sala / 100;
    }, [sala, despierto]);

    const alternarCapa = (capa: KeyLayer) =>
        setCapas((previas) =>
            previas.includes(capa)
                ? previas.filter((c) => c !== capa)
                : KEY_LAYERS.filter((c) => previas.includes(c) || c === capa)
        );

    return (
        // ⚠ EL SCROLL SE ABRE ACÁ Y NO EN EL CSS GLOBAL. `html, body` llevan
        // `overflow: hidden` porque la app es una terminal de altura fija, y eso
        // está bien para la app. Un catálogo largo necesita lo contrario, así que
        // se resuelve en la página y no tocando la base de todo el producto.
        <main
            className="mono"
            style={{ height: '100dvh', overflowY: 'auto', position: 'relative', zIndex: 2 }}
        >
            <div
                style={{
                    maxWidth: '58rem',
                    margin: '0 auto',
                    padding: '2rem 1.5rem 6rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2.5rem',
                }}
            >
                <header style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap',
                        }}
                    >
                        <h1 className="pixel" style={{ fontSize: 'var(--text-3xl)' }}>
                            IDENTIDAD DEL SISTEMA
                        </h1>
                        <button type="button" className="btn-terminal" onClick={toggleTheme}>
                            [{tema === 'dark' ? '◑ OSCURO' : '◐ CLARO'}]
                        </button>
                    </div>
                    <p className="comment">
                        todo lo que existe, con su nombre · no se publica: enseña las respuestas
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        <span className="diag-value tabular-nums">
                            {COLOR_TOKENS.length} colores
                        </span>
                        <span className="diag-value tabular-nums">
                            {/* PIEZAS y DIBUJOS no son el mismo número: la
                                catorce tiene dos caras y sólo te toca una. */}
                            {ART_TOTAL} piezas · {ART_TOTAL + ART_FACES.length} dibujos
                        </span>
                        <span className="diag-value tabular-nums">
                            {SYSTEM_ICONS.length} iconos
                        </span>
                        <span className="diag-value tabular-nums">
                            {SYSTEM_SCREENS_TOTAL} pantallas
                        </span>
                        <span className="diag-value tabular-nums">
                            {VISUAL_EFFECTS_TOTAL} efectos
                        </span>
                        <span className="diag-value tabular-nums">
                            {Object.keys(PEAK_DBFS).length} familias de sonido
                        </span>
                    </div>
                </header>

                <hr className="rule-dashed" />

                <Seccion
                    titulo="COLOR"
                    nota="leído del tema activo, no copiado · cambiá el tema arriba y mirá"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {COLOR_TOKENS.map((t) => (
                            <div
                                // El tema va en la clave a propósito: cambiarlo
                                // remonta la fila y con eso se relee el valor.
                                key={`${t.id}-${tema}`}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            >
                                <span
                                    aria-hidden="true"
                                    style={{
                                        width: 28,
                                        height: 28,
                                        flex: 'none',
                                        background: `var(--${t.id})`,
                                        border: '1px solid var(--color-line-soft)',
                                    }}
                                />
                                <span style={{ minWidth: '11rem' }}>--{t.id}</span>
                                <Valor token={t.id} />
                                <Guia />
                                <span className="comment" style={{ textAlign: 'right' }}>
                                    {t.para}
                                </span>
                            </div>
                        ))}
                    </div>
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion titulo="TIPOGRAFIA" nota="dos familias, y sólo dos">
                    {FONT_TOKENS.map((f) => (
                        <div
                            key={f.id}
                            style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}
                        >
                            <span style={{ fontFamily: `var(--${f.id})`, fontSize: '1.6rem' }}>
                                Sin_titulo.txt · 0123456789 · [TODO_BIEN]
                            </span>
                            <span className="comment">
                                --{f.id} · {f.para}
                            </span>
                        </div>
                    ))}

                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.3rem',
                            marginTop: '0.5rem',
                        }}
                    >
                        {TEXT_TOKENS.map((t) => (
                            <div
                                key={`${t.id}-${tema}`}
                                style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}
                            >
                                <span style={{ fontSize: `var(--${t.id})`, minWidth: '13rem' }}>
                                    El zorro veloz
                                </span>
                                <Valor token={t.id} />
                                <Guia />
                                <span className="comment">{t.para}</span>
                            </div>
                        ))}
                    </div>
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo="VOCABULARIO"
                    nota="los corchetes, el filete de puntos, los medidores ASCII"
                >
                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}
                    >
                        <button type="button" className="btn-terminal">
                            [+] Nueva nota
                        </button>
                        <button type="button" className="btn-terminal is-danger">
                            [ELIMINAR]
                        </button>
                        <button type="button" className="btn-terminal" disabled>
                            [DESHACER]
                        </button>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '0.75rem',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                        }}
                    >
                        <MetaTag>14:32</MetaTag>
                        <MetaTag variant="warning">SIN GUARDAR</MetaTag>
                        <MetaTag variant="error">SIN RED</MetaTag>
                        <span className="comment">
                            no hay variante de éxito: que todo vaya bien no se pinta
                        </span>
                    </div>

                    <ProgressBar value={62} label="INTEGRIDAD" name="Integridad del sistema" />

                    <div className="file-row">
                        <span className="file-row-name">notas_del_jueves.txt</span>
                        <Guia />
                        <span className="file-row-status">7 KB</span>
                    </div>

                    <input className="input-terminal" defaultValue="Sin_titulo.txt" readOnly />
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo={`ICONOS · LOS ${SYSTEM_ICONS.length}`}
                    nota="todos entre corchetes y de trazo fino · ninguno es un emoji"
                >
                    {SYSTEM_ICONS.map((i) => (
                        <div
                            key={i.glifo}
                            style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}
                        >
                            <span style={{ minWidth: '3.5rem', fontSize: 'var(--text-lg)' }}>
                                {i.glifo}
                            </span>
                            <Guia />
                            <span className="comment">{i.para}</span>
                        </div>
                    ))}
                    <p className="comment">
                        el de la papelera fue un emoji y se quitó: se pintaba a color y parecía una
                        calcomanía pegada encima
                    </p>
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo={`ARTE · ${ART_TOTAL} PIEZAS, ${ART_TOTAL + ART_FACES.length} DIBUJOS`}
                    nota="la catorce tiene dos caras: el hueco es uno y lo decide el final"
                >
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(16rem, 1fr))',
                            gap: '1.25rem',
                        }}
                    >
                        {[
                            ...ART.map((p) => ({ id: p.id, art: p.art, pie: `se gana por ${p.source}` })),
                            /*
                             * ⚠ LA CARA TAPADA DE LA CATORCE, que no es una
                             * pieza diecisiete. El hueco es uno y cuál te toca
                             * depende del final: ayudarlo deja el ojo,
                             * reportarlo deja el ojo vedado. Contarlas como dos
                             * dejaría la colección imposible de completar.
                             *
                             * Faltaba acá, y era justo el dibujo del final que
                             * menos gente ve.
                             */
                            ...ART_FACES.map((c) => ({
                                id: `${c.of} · tapado`,
                                art: c.art,
                                pie: 'la otra cara del mismo hueco · el otro final',
                            })),
                        ].map((p) => (
                            <figure key={p.id} style={{ margin: 0 }}>
                                {/*
                                    ⚠ TODOS EN UNA CAJA DEL MISMO ALTO. Los
                                    dieciséis miden 40 columnas —eso lo fija
                                    `ARTE.md`— pero van de diez a catorce filas,
                                    así que en una rejilla quedaban desparejos y
                                    la sección se leía como si estuviera rota.
                                    El alto se toma del más largo y el dibujo se
                                    centra: cambiar el tamaño de la LETRA para
                                    igualarlos sería mentir sobre la pieza.
                                */}
                                <div
                                    style={{
                                        height: '11rem',
                                        display: 'grid',
                                        placeItems: 'center',
                                        overflow: 'hidden',
                                        background: 'var(--color-tertiary)',
                                        border: '1px solid var(--color-line-soft)',
                                    }}
                                >
                                    <pre
                                        className="mono"
                                        style={{
                                            margin: 0,
                                            padding: '0.5rem',
                                            fontSize: 9,
                                            lineHeight: 1.15,
                                        }}
                                    >
                                        {p.art}
                                    </pre>
                                </div>
                                <figcaption className="comment" style={{ marginTop: '0.35rem' }}>
                                    {p.id} · {p.pie}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo={`PANTALLAS · LAS ${SYSTEM_SCREENS_TOTAL}`}
                    nota="los componentes de verdad, montados enteros y desactivados"
                >
                    {/*
                        ⚠ NO SON MAQUETAS. Son los mismos componentes que usa la
                        app, con sus tiempos y su texto. Van INERTES: lo que
                        estas pantallas hacen —recargar, devolver al arranque,
                        cerrar la pestaña— ocurre en sus `onDone`, o sea en quien
                        las usa, así que neutralizarlos deja intacto el aspecto y
                        no toca nada.
                    */}
                    {SYSTEM_SCREENS.map((p) => (
                        <div
                            key={p.id}
                            className="file-row"
                            style={{ gap: '0.75rem', alignItems: 'baseline' }}
                        >
                            <span className="file-row-name">{p.nombre}</span>
                            <Guia />
                            <span className="comment">{p.componente}</span>
                            <button
                                type="button"
                                className="btn-terminal"
                                onClick={() => setPantalla(p)}
                            >
                                [VER]
                            </button>
                        </div>
                    ))}
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo={`EFECTOS · LOS ${VISUAL_EFFECTS_TOTAL}`}
                    nota="uno por cada @keyframes · abrí cualquiera a pantalla completa"
                >
                    {/*
                        ⚠ SIN MINIATURAS, Y ES LA DECISIÓN DE DISEÑO DE ESTA
                        SECCIÓN. El primer intento fue una rejilla de 25 recuadros
                        de 132 píxeles, y no servía: estos efectos están hechos
                        para la pantalla entera —el barrido tarda nueve segundos
                        en cruzarla, el sincronismo mueve la imagen catorce
                        píxeles— así que en una caja la mitad son imperceptibles.
                        Veinticinco cajas donde no pasa nada visible no es un
                        catálogo: es ruido que además miente por omisión.

                        Una lista dice lo que hay y el visor enseña lo que es.
                    */}
                    {(Object.keys(TITULO_HOJA) as EffectSheet[]).map((hoja) => (
                        <div key={hoja} style={{ marginTop: '0.5rem' }}>
                            <h3
                                className="pixel"
                                style={{ fontSize: 'var(--text-lg)', marginBottom: '0.5rem' }}
                            >
                                {TITULO_HOJA[hoja]}
                            </h3>

                            {effectsOf(hoja).map((efecto) => (
                                <div
                                    key={efecto.id}
                                    className="file-row"
                                    style={{ gap: '0.75rem', alignItems: 'baseline' }}
                                >
                                    <span className="file-row-name">{efecto.nombre}</span>
                                    <Guia />
                                    <span className="comment">{efecto.id}</span>
                                    <button
                                        type="button"
                                        className="btn-terminal"
                                        onClick={() => setMirando(efecto)}
                                    >
                                        [VER]
                                    </button>
                                </div>
                            ))}
                        </div>
                    ))}
                </Seccion>

                <hr className="rule-dashed" />

                <Seccion
                    titulo="SONIDO"
                    nota="la página está muda hasta el primer gesto · es ley del navegador"
                >
                    <div className="diag-row">
                        <span className="diag-label">CONTEXTO</span>
                        <span className="diag-value">{despierto ? 'DESPIERTO' : 'DORMIDO'}</span>
                    </div>
                    <div className="diag-row">
                        <span className="diag-label">INTERRUPTOR</span>
                        <span className="diag-value">{encendido ? 'ON' : 'OFF'}</span>
                    </div>
                    <div className="diag-row">
                        <span className="diag-label">ULTIMO</span>
                        <span className="diag-value">{ultimo}</span>
                    </div>
                    <button
                        type="button"
                        className="btn-terminal"
                        style={{ alignSelf: 'flex-start' }}
                        onClick={() => {
                            const siguiente = !encendido;
                            setSoundOn(siguiente);
                            if (!siguiente) setDespierto(false);
                        }}
                    >
                        [{encendido ? 'APAGAR' : 'ENCENDER'} SONIDO]
                    </button>

                    {SUELTAS.map((v) => (
                        <div
                            key={v.name}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                        >
                            <button
                                type="button"
                                className="btn-terminal"
                                onClick={() => disparar(() => play(v.name), v.label)}
                            >
                                [{v.label}]
                            </button>
                            <Guia />
                            <span className="comment">{v.nota}</span>
                        </div>
                    ))}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                            type="button"
                            className="btn-terminal"
                            onClick={() => disparar(() => play('beep', { hz: 880, ms: 90 }), 'BIP')}
                        >
                            [BIP]
                        </button>
                        <button
                            type="button"
                            className="btn-terminal"
                            onClick={() =>
                                disparar(() => play('beep', { hz: 220, ms: 320 }), 'ERROR')
                            }
                        >
                            [ERROR]
                        </button>
                        <Guia />
                        <span className="comment">la bocinita · tiene que sonar barata</span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '0.75rem',
                        }}
                    >
                        {KEY_LAYERS.map((capa) => (
                            <label
                                key={capa}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                                <input
                                    type="checkbox"
                                    checked={capas.includes(capa)}
                                    onChange={() => alternarCapa(capa)}
                                />
                                <span>{capa.toUpperCase()}</span>
                            </label>
                        ))}
                        <button
                            type="button"
                            className="btn-terminal"
                            onClick={() =>
                                disparar(() => {
                                    // Directo a la voz y NO por `play`: acá
                                    // interesa oír la capa suelta, y la compuerta
                                    // está para la app, no para el diagnóstico.
                                    const g = ensureAudio();
                                    if (g) voiceKey(g, Math.random, capas);
                                }, `TECLA(${capas.join('+') || 'nada'})`)
                            }
                        >
                            [CAPAS SUELTAS]
                        </button>
                        <span className="comment">
                            si suena mal hay que saber cuál falla · mezcladas es imposible
                        </span>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="diag-label" style={{ minWidth: '5rem' }}>
                            TEMBLOR
                        </span>
                        <input
                            type="range"
                            min={1}
                            max={12}
                            value={temblor}
                            onChange={(e) => setTemblor(Number(e.target.value))}
                        />
                        <span className="diag-value tabular-nums">{temblor}px</span>
                        <button
                            type="button"
                            className="btn-terminal"
                            onClick={() =>
                                disparar(
                                    () =>
                                        play('glitchBurst', {
                                            amplitudePx: temblor,
                                            durationMs: 180,
                                        }),
                                    `GLITCH ${temblor}px`
                                )
                            }
                        >
                            [GLITCH]
                        </button>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="diag-label" style={{ minWidth: '5rem' }}>
                            CUARTO
                        </span>
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={sala}
                            onChange={(e) => setSala(Number(e.target.value))}
                        />
                        <span className="diag-value tabular-nums">{sala}%</span>
                        <span className="comment">a 0 es un navegador · a 50 es una habitación</span>
                    </label>

                    <textarea
                        className="editor-textarea"
                        rows={4}
                        placeholder="escribí acá, rápido, un párrafo entero"
                        onKeyDown={(e) => {
                            // Los modificadores solos no golpean ninguna tecla:
                            // pulsar Shift no suena, suena la letra.
                            if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') {
                                return;
                            }
                            despertar();
                            play('key');
                        }}
                    />
                    <p className="comment">
                        la prueba de verdad · acá actúa la compuerta de 60 ms, como en la app
                    </p>

                    {Object.entries(PEAK_DBFS).map(([familia, db]) => (
                        <div key={familia} className="diag-row">
                            <span className="diag-label">{familia.toUpperCase()}</span>
                            <span className="diag-value tabular-nums">{db} dBFS</span>
                        </div>
                    ))}
                </Seccion>

                {/*
                    ⚠ DE DÓNDE SALE CADA SONIDO, que es la mitad que faltaba.
                    Arriba se pueden oír las voces sueltas; acá se ve QUÉ LAS
                    DISPARA. Las dos listas salen del código —`SCREEN_SOUNDS` y
                    `EVENT_SOUNDS`— y hay un test que exige que entre las dos no
                    falte ninguna voz de las que declaran familia.
                */}
                <Seccion
                    titulo={`SONIDO · SUS ${SCREEN_SOUNDS.length + EVENT_SOUNDS.length} SUCESOS`}
                    nota="cada sonido con lo que lo dispara · y ninguna voz sin suceso"
                >
                    <p className="comment">
                        lo que se VE · una marca que la app ya pinta, y el sonido la reconoce
                    </p>

                    {SCREEN_SOUNDS.map((p) => (
                        <Fila
                            key={p.mark}
                            suceso={p.what}
                            voz={p.shot?.voice ?? (p.tone ? 'tono' : '—')}
                            donde={`.${p.mark}`}
                            onOir={
                                p.shot
                                    ? () => disparar(() => fire(p.shot!), p.mark)
                                    : undefined
                            }
                        />
                    ))}

                    <p className="comment">
                        lo que NO se ve · teclas, almacenes y observadores de atributos
                    </p>

                    {EVENT_SOUNDS.map((e) => (
                        <Fila
                            key={e.voice}
                            suceso={e.what}
                            voz={e.voice}
                            donde={e.where}
                            pendiente={e.pending}
                            onOir={
                                // Las que llevan argumentos no se pueden disparar
                                // a ciegas desde acá: tienen su propio mando más
                                // arriba, con el temblor y los hercios a mano.
                                e.voice === 'glitchBurst' ||
                                e.voice === 'sweep' ||
                                e.voice === 'beep' ||
                                e.voice === 'confirm'
                                    ? undefined
                                    : () => disparar(() => play(e.voice as never), e.voice)
                            }
                        />
                    ))}

                    <p className="comment">
                        y las internas · piezas de otras voces, nunca se piden solas:{' '}
                        {INTERNAL_VOICES.join(', ')}
                    </p>
                </Seccion>
            </div>

            {mirando && <EffectViewer efecto={mirando} onClose={() => setMirando(null)} />}
            {pantalla && (
                <ScreenViewer pantalla={pantalla} onClose={() => setPantalla(null)} />
            )}
        </main>
    );
}
