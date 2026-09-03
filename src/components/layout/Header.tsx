// src/components/layout/Header.tsx
'use client';

import { useEffect, useSyncExternalStore } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useToday } from '@/hooks/useToday';
import { useSystemState } from '@/hooks/useSystemState';
import { reversedDate } from '@/lib/system/v02Chrome';
import SystemLabel from '@/components/layout/SystemLabel';
import LanguageToggle from '@/components/ui/LanguageToggle';
import { useT, type TranslationKey } from '@/i18n';
import ScrambleLine from '@/components/effects/ScrambleLine';
import { isGlimpsing, subscribeHints } from '@/lib/system/artHints';
import { readFound, readRevealed } from '@/lib/system/asciiArt';
import { fireGlitch } from '@/hooks/useGlitch';
import type { View } from '@/types/note.types';

interface HeaderProps {
    currentView: View;
    onViewChange: (view: View) => void;
    trashCount?: number;
    /** Cuántas piezas llevás. Sin ninguna, la pestaña ni aparece. */
    collectionCount?: number;
    /** Lo pide el rótulo cuando alguien insiste nueve veces (§5). */
    onCollapse?: () => void;
}

// Las pestañas guardan la CLAVE, no el rótulo: el texto se resuelve en el
// render, que es cuando se sabe el idioma. Una constante de módulo con el texto
// ya traducido se congelaría en el idioma que hubiera al importar el archivo.
const TABS: { view: View; labelKey: TranslationKey }[] = [
    { view: 'notes', labelKey: 'nav.notes' },
    { view: 'trash', labelKey: 'nav.trash' },
    // La colección va la última y con estrella: es lo que se GANA, no una parte
    // de la app que estuviera ahí desde el principio.
    { view: 'collection', labelKey: 'nav.collection' },
];

/**
 * El estado de la pestaña de colección.
 *
 * Dos cosas distintas que antes estaban mezcladas en una:
 *
 *   · `sinVer` — tenés piezas y todavía no miraste el catálogo. Es PERMANENTE:
 *     la pestaña se queda ahí, revuelta, hasta que teclees `//art`. La primera
 *     versión la enseñaba 1,2 segundos y la escondía, y eso no era una pista:
 *     era un parpadeo que se perdía si mirabas a otro lado.
 *   · `reciente` — acabás de ganarla ahora mismo. Sólo sirve para disparar el
 *     tirón visual UNA vez, y por eso es una ventana corta: sin ella, al recargar
 *     con piezas sin ver la pantalla daría un tirón en cada carga.
 *
 * `useSyncExternalStore` y no un estado: quien enciende esto es `awardPiece`,
 * desde fuera de React y desde cualquier sitio —incluido un comando—, y un
 * `useState` acá no se enteraría.
 */
function useArtTab(): { sinVer: boolean; reciente: boolean } {
    const cuentas = useSyncExternalStore(
        subscribeHints,
        () => `${readFound().size}:${readRevealed().size}`,
        () => '0:0'
    );
    const reciente = useSyncExternalStore(
        subscribeHints,
        () => isGlimpsing(),
        () => false
    );

    const [ganadas, vistas] = cuentas.split(':').map(Number);

    return { sinVer: ganadas > 0 && vistas === 0, reciente };
}

export default function Header({
    currentView,
    onViewChange,
    trashCount,
    collectionCount,
    onCollapse,
}: HeaderProps) {
    const t = useT();

    // La pestaña de colección: si asoma revuelta, y si acaba de asomar.
    const { sinVer: destello, reciente } = useArtTab();

    /*
     * EL TIRÓN AL GANAR LA PRIMERA PIEZA.
     *
     * El mismo fallo visual que el botón secreto del rótulo, no uno nuevo: acá
     * no hacía falta inventar nada, y un efecto propio para esto habría sido un
     * segundo lenguaje diciendo lo mismo.
     *
     * Va atado a `reciente` y no a `sinVer` porque `sinVer` sigue siendo cierto
     * mientras no mires el catálogo: con él, la pantalla daría un tirón en CADA
     * recarga hasta que teclearas `//art`.
     */
    useEffect(() => {
        if (reciente) fireGlitch(Math.random, 'major');
    }, [reciente]);

    // La fecha se pinta sólo en el cliente (ver useToday).
    const { v02 } = useSystemState();
    const today = useToday();

    // LA FECHA DE LA v0.2 SALE DEL REVÉS: `2026.09.02` se lee `20.90.6202`.
    //
    // Se le da la vuelta a la CADENA ENTERA, que es el error de verdad — alguien
    // creyó que eso cambiaba el formato. Invertir el orden de los campos daría
    // `02.09.2026`, que es otro formato correcto, y lo que hace falta acá es uno
    // roto del que se vea enseguida qué le pasó.
    const fecha = today === null ? null : v02 ? reversedDate(today) : today;

    /**
     * Qué pestaña se pinta como abierta.
     *
     * El editor es una SUB-VISTA de las notas, así que marca «Notas». Todo lo
     * demás se marca a sí mismo.
     *
     * ⚠ Estaba escrito al revés —«papelera, y si no, notas»— y funcionó mientras
     * sólo hubo dos pestañas. Al aparecer la colección, su vista se pintaba pero
     * la marca de «acá estás» se quedaba en NOTAS: la pantalla decía una cosa y
     * la cabecera otra. Una lista blanca que se traga lo que no reconoce
     * envejece mal por definición; ahora sólo el editor es excepción.
     */
    const activeTab: View = currentView === 'editor' ? 'notes' : currentView;

    return (
        <header className="terminal-header">
            <SystemLabel onCollapse={onCollapse ?? (() => {})} />

            <nav aria-label={t('nav.viewsLabel')} className="flex items-center gap-1">
                {TABS.filter(
                    // Sin ninguna pieza la pestaña NO APARECE. Enseñarla vacía
                    // anunciaría que hay una colección que llenar, y encontrar
                    // la primera pieza es parte de lo que se descubre.
                    //
                    // ⚠ SALVO SI TENÉS PIEZAS SIN VER: entonces ASOMA, con el
                    // nombre revuelto, y NO DEJA ENTRAR. Es la primera de las
                    // tres pistas que llevan a `//art` — dice «hay un sitio», no
                    // dice cuál ni cómo se entra.
                    ({ view }) =>
                        view !== 'collection' || Boolean(collectionCount) || destello
                ).map(({ view, labelKey }) => {
                    // Asomada pero cerrada. Pulsarla y que no pasara nada sería
                    // un botón roto; deshabilitada se lee como lo que es: algo
                    // que todavía no está disponible.
                    const cerrada =
                        view === 'collection' && destello && !collectionCount;

                    return (
                    <button
                        key={view}
                        type="button"
                        onClick={() => onViewChange(view)}
                        disabled={cerrada}
                        aria-disabled={cerrada || undefined}
                        className="nav-tab"
                        aria-current={activeTab === view ? 'page' : undefined}
                    >
                        [{view === 'collection' ? '★ ' : ''}
                        {/* Durante el destello el rótulo NO se lee: se revuelve,
                            como todo lo que existe y todavía no descubriste. Un
                            nombre legible sería un cartel. */}
                        {cerrada ? (
                            <ScrambleLine length={t(labelKey).length} prefix="" inline />
                        ) : (
                            t(labelKey)
                        )}
                        {view === 'trash' && trashCount ? ` ${trashCount}` : ''}
                        {view === 'collection' && collectionCount
                            ? ` ${collectionCount}`
                            : ''}
                        ]
                    </button>
                    );
                })}
            </nav>

            <div className="flex items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
                <span className="mono text-xs dim" suppressHydrationWarning>
                    [{t('nav.dateLabel')}: {fecha ?? t('nav.datePlaceholder')}]
                </span>
            </div>
        </header>
    );
}
