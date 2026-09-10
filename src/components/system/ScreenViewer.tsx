// src/components/system/ScreenViewer.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BootScreen from '@/components/effects/BootScreen';
import BootGate from '@/components/effects/BootGate';
import WipeScreen from '@/components/effects/WipeScreen';
import SystemCollapse from '@/components/effects/SystemCollapse';
import SystemLockout from '@/components/effects/SystemLockout';
import DeadPage from '@/components/effects/DeadPage';
import CollectionCeremony from '@/components/effects/CollectionCeremony';
import PongOverlay from '@/components/effects/PongOverlay';
import { ChromaSplitFilters } from '@/components/effects/ChromaticFailure';
import { useTheme, toggleTheme } from '@/hooks/useTheme';
import type { SystemScreen } from '@/lib/system/screensCatalog';

/**
 * UNA PANTALLA DEL SISTEMA, LA DE VERDAD, MONTADA ENTERA.
 *
 * ⚠ SON LOS COMPONENTES REALES Y NO IMITACIONES. Es la única forma de que se
 * comporten como se comportan: el arranque recorre sus tramos con sus tiempos,
 * el barrido cuenta lo que borra, el colapso escala según la insistencia. Una
 * maqueta enseñaría lo que yo recuerdo de ellas, que no es lo mismo.
 *
 * ⚠ Y VAN INERTES. Estas pantallas hacen cosas: el barrido devuelve al arranque,
 * el colapso recarga la página, la muerta intenta cerrar la pestaña. Todo eso
 * ocurre en los `onDone`, o sea en QUIEN LAS USA y no dentro de ellas, así que
 * neutralizarlos deja el aspecto y el ritmo intactos sin tocar nada. Un catálogo
 * que te secuestra la sesión al consultarlo deja de servir para consultarlo.
 *
 * La única excepción es `DeadPage`, que llama a `window.close()` ella misma. El
 * navegador lo bloquea salvo en pestañas abiertas por script — su propio código
 * lo dice y lo da por supuesto.
 */

/** Se pasa donde una pantalla avisaría de que terminó. No hace nada. */
const INERTE = () => {};

/**
 * ⚠ ESTAS PANTALLAS APAGAN A SUS HERMANAS, Y ESO DECIDE DÓNDE SE MONTAN.
 *
 * El arranque y el barrido no se limitan a taparlo todo: ponen un atributo en
 * el documento y el CSS apaga a los demás HIJOS DIRECTOS DE `body`, salvándose
 * a sí mismos por clase.
 *
 *     [data-booting] body > *:not(.boot-screen):not(.scanline-effect)
 *     [data-wiping]  body > *:not(.wipe-screen):not(.scanline-effect)
 *
 * Metidas dentro de un diálogo dejan de ser hijas de `body`, así que la regla
 * ya no las excluye: se apagan A SÍ MISMAS junto con todo lo demás y la
 * pantalla queda en blanco. Fue exactamente lo que pasó.
 *
 * Por eso van en un portal a `body`: es el único sitio donde se comportan como
 * en la app, que es la razón entera de montar los componentes de verdad.
 */

/**
 * La escalada que se le enseña al colapso.
 *
 * Valores del primer colapso: vuelve solo, sin castigo. Los siguientes suben la
 * intensidad y el último ya no vuelve — pero eso es la escalada del juego, no
 * algo que este catálogo deba decidir por nadie.
 */
const COLAPSO_SUAVE = { rebootMs: 4_000, intensity: 1, lockout: false };

/**
 * Y el de la v0.2, que no tiene grados: se detiene a la primera.
 *
 * `rebootMs: 0` porque no hay rearranque que cronometrar, e `intensity: 3`
 * porque ahí la propia pantalla de recuperación falla a la cadencia más alta —
 * son los mismos valores que devuelve el almacén en esa versión.
 */
const COLAPSO_V02 = { rebootMs: 0, intensity: 3, lockout: false };

function Contenido({ pantalla, reiniciar }: { pantalla: SystemScreen; reiniciar: () => void }) {
    switch (pantalla.id) {
        case 'gate':
            // Inerte: acá no deja pasar a ningún sitio, sólo se enseña.
            return <BootGate onReady={INERTE} />;
        case 'boot':
            return <BootScreen onDone={reiniciar} />;
        case 'boot-v02':
            /*
             * ⚠ SE LE PIDE LA VERSIÓN, no se enciende la v0.2. Esa marca vive en
             * el almacenamiento y no se iría al cerrar el visor: quien vino a
             * mirar un arranque se quedaría jugando en otra versión.
             */
            return <BootScreen onDone={reiniciar} v02 />;
        case 'wipe':
            return <WipeScreen onDone={reiniciar} />;
        case 'collapse':
            return <SystemCollapse notesCount={12} level={COLAPSO_SUAVE} onDone={reiniciar} />;
        case 'collapse-v02':
            /*
             * La consola es de verdad y funciona: escribir `reboot` cierra el
             * visor, que es lo más parecido a levantar la máquina que se puede
             * hacer acá sin tocarle la partida a nadie.
             */
            return (
                <SystemCollapse
                    notesCount={12}
                    level={COLAPSO_V02}
                    onDone={INERTE}
                    onManualReboot={reiniciar}
                    v02
                />
            );
        case 'lockout':
            return <SystemLockout />;
        case 'dead':
            return <DeadPage />;
        case 'pong':
            return <PongOverlay open onClose={INERTE} />;
        case 'chromatic':
            /*
             * La avería NO es un componente que se monte: es un ESTADO que pone
             * una clase sobre todo lo visible. Se reproduce igual —la clase de
             * verdad, más los `<defs>` sin los que el filtro no pinta nada— y
             * así no hace falta romperle la señal a la app para verla.
             */
            return (
                <>
                    <ChromaSplitFilters />
                    <div className="chromatic-failure" style={{ position: 'absolute', inset: 0 }}>
                        <Maqueta />
                    </div>
                </>
            );
        case 'coleccion':
            /*
             * Se reproduce sola y NO toca el almacén: un catálogo que te
             * regala las dieciséis piezas al consultarlo deja de serlo.
             */
            return <CollectionCeremony demo />;
        case 'v02':
            // La piel de la v0.2 es un atributo en el documento; lo pone el
            // efecto de abajo y lo quita al cerrar.
            return <Maqueta />;
        default:
            return null;
    }
}

/** Algo de app para que las pantallas de ESTADO tengan qué vestir. */
function Maqueta() {
    return (
        <div className="container-terminal" aria-hidden="true">
            <header className="terminal-header">
                <span className="pixel">FLASH-NOTES v1.0</span>
                <span className="comment">12 archivos</span>
            </header>

            <div className="file-container" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="section-header">ARCHIVOS_DISPONIBLES</div>
                {[
                    ['Sin_titulo.txt', '2 KB'],
                    ['notas_del_jueves.txt', '7 KB'],
                    ['lista_de_la_compra.txt', '1 KB'],
                    ['no_borrar_esto.txt', '14 KB'],
                ].map(([nombre, peso]) => (
                    <div className="file-row" key={nombre}>
                        <span className="file-row-name">{nombre}</span>
                        <span className="file-row-leader" />
                        <span className="file-row-status">{peso}</span>
                    </div>
                ))}
                <p className="mono" style={{ marginTop: '1rem' }}>
                    &gt; <span className="cursor-block" />
                </p>
            </div>

            <footer className="status-bar">
                <span>[TODO_BIEN]</span>
                <span className="tabular-nums">01001100 01001111 01010010</span>
            </footer>
        </div>
    );
}

export default function ScreenViewer({
    pantalla,
    onClose,
}: {
    pantalla: SystemScreen;
    onClose: () => void;
}) {
    const [pase, setPase] = useState(0);
    /**
     * ⚠ Y AL TERMINAR SE DESMONTAN, en vez de repetirse.
     *
     * Mientras la secuencia corre, sus atributos apagan los mandos —son otro
     * hijo de `body`— así que un bucle los dejaría invisibles para siempre. Al
     * desmontarla, el componente retira su atributo y los mandos vuelven.
     *
     * En la app, al acabar entregan el control a otra cosa; acá eso está
     * desactivado, así que lo honesto es decir que terminó y ofrecer repetirla.
     */
    const [terminada, setTerminada] = useState(false);
    const tema = useTheme();
    const cerrarRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const alPulsar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', alPulsar);
        cerrarRef.current?.focus();

        return () => document.removeEventListener('keydown', alPulsar);
    }, [onClose]);

    useEffect(() => {
        if (pantalla.como !== 'atributo') return;

        // La piel de la v0.2 cuelga de un atributo del documento. Se quita al
        // cerrar: dejarlo pegado metería la app entera en la versión vieja.
        document.documentElement.setAttribute('data-v02', '1');

        return () => document.documentElement.removeAttribute('data-v02');
    }, [pantalla.como]);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pantalla ${pantalla.nombre}`}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                background: 'var(--color-primary)',
                overflow: 'hidden',
            }}
        >
            {/*
                El portal las devuelve a `body`, que es donde su CSS las espera.
                Se salta el diálogo a propósito: dentro de él se apagarían solas.
            */}
            {!terminada &&
                createPortal(
                    /*
                     * ⚠ SIN ENVOLTORIO, y por el mismo motivo que existe el
                     * portal: la regla es `body > *:not(.boot-screen)`, así que
                     * un `div` intermedio —hijo de `body` y sin esa clase— se
                     * apaga él, y se lleva por delante la pantalla que envuelve.
                     * La `key` va en el propio componente para poder repetirlo.
                     */
                    <Contenido
                        key={pase}
                        pantalla={pantalla}
                        reiniciar={() => setTerminada(true)}
                    />,
                    document.body
                )}

            {/* Los mandos, por delante de todo: varias de estas pantallas se
                pintan a `z-index` altísimos porque en la app tapan el mundo. */}
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 10020,
                    padding: '1rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '1rem',
                    background: 'var(--color-secondary)',
                    borderTop: '1px solid var(--color-line)',
                }}
            >
                <div style={{ flex: '1 1 22rem', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                        <strong className="pixel" style={{ fontSize: 'var(--text-lg)' }}>
                            {pantalla.nombre}
                        </strong>
                        <span className="comment">{pantalla.componente}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{pantalla.que}</p>
                    <p className="comment" style={{ margin: 0 }}>
                        {pantalla.cuando}
                    </p>
                    {pantalla.inerte && (
                        <p className="comment" style={{ margin: 0 }}>
                            {terminada ? 'la secuencia termino · ' : ''}en la app, al terminar{' '}
                            {pantalla.inerte}
                        </p>
                    )}
                </div>

                <button type="button" className="btn-terminal" onClick={toggleTheme}>
                    [{tema === 'dark' ? '◑ OSCURO' : '◐ CLARO'}]
                </button>
                <button
                    type="button"
                    className="btn-terminal"
                    onClick={() => {
                        setTerminada(false);
                        setPase((p) => p + 1);
                    }}
                >
                    [OTRA VEZ]
                </button>
                <button ref={cerrarRef} type="button" className="btn-terminal" onClick={onClose}>
                    [CERRAR · ESC]
                </button>
            </div>
        </div>
    );
}
