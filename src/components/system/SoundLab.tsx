// src/components/system/SoundLab.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { KEY_LAYERS, key as voiceKey, type KeyLayer } from '@/lib/system/audio/voices';
import { ensureAudio, setSoundOn, teardownAudio } from '@/lib/system/audio/context';
import { useSound } from '@/hooks/useSound';
import { PEAK_DBFS } from '@/lib/system/audio/mix';
import { play, type VoiceName } from '@/lib/system/audio/play';

/**
 * EL BANCO DE PRUEBAS. Sólo en desarrollo — la ruta devuelve 404 fuera de ahí.
 *
 * ⚠ NO ES UNA PÁGINA DE DEMOSTRACIÓN, ES UN INSTRUMENTO DE DIAGNÓSTICO.
 *
 * El plan del sonido deja tres decisiones escritas como «se resuelve
 * escuchando», y ninguna se puede contestar dentro de la app: ahí cada sonido
 * llega mezclado con otros diez, sólo cuando el juego quiere, y con la
 * compuerta recortando. Si la tecla suena mal, dentro de la app no hay forma de
 * saber si falla el chasquido, el cuerpo o el fondo.
 *
 * Acá cada voz se dispara suelta y repetida, las capas de la tecla se oyen por
 * separado, y la sala se puede quitar para comparar. Ésa es toda la ambición.
 *
 * El primer botón es especial: el navegador no deja sonar nada hasta que hay un
 * gesto, así que hasta que no se pulse algo esta página está muda por ley.
 */

/** Las voces que se pueden disparar tal cual, sin argumentos. */
const SUELTAS: { name: VoiceName; label: string; nota: string }[] = [
    { name: 'key', label: 'TECLA', nota: 'tres capas · lo que más va a sonar' },
    { name: 'tick', label: 'TIC', nota: 'teletipo · una por línea, nunca por carácter' },
    { name: 'relay', label: 'RELE', nota: 'dos chasquidos · la armadura rebota' },
];

export default function SoundLab() {
    const [despierto, setDespierto] = useState(false);
    // Del almacén y no de un estado local: el interruptor se toca también desde
    // el panel y desde `//sound`, y leerlo al pintar violaría C1.
    const encendido = useSound();
    const [sala, setSala] = useState(50);
    const [temblor, setTemblor] = useState(6);
    const [capas, setCapas] = useState<readonly KeyLayer[]>(KEY_LAYERS);
    const [ultimo, setUltimo] = useState('—');

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
        <main className="mono mx-auto max-w-3xl p-6 flex flex-col gap-6">
            <header>
                <h1 className="pixel text-2xl">BANCO DE SONIDO</h1>
                <p className="comment">
                    {/* Sin traducir a propósito: esto no existe en producción, y
                        pasarlo por i18n sería mantener texto que nadie va a leer. */}
                    {'// no existe fuera de desarrollo · la pagina esta muda hasta el primer gesto'}
                </p>
            </header>

            <section className="flex flex-col gap-2">
                <h2 className="section-header">ESTADO</h2>
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
                    className="btn-terminal self-start"
                    onClick={() => {
                        const siguiente = !encendido;
                        setSoundOn(siguiente);
                        if (!siguiente) setDespierto(false);
                    }}
                >
                    [{encendido ? 'APAGAR' : 'ENCENDER'} SONIDO]
                </button>
            </section>

            <hr className="rule-dashed" />

            <section className="flex flex-col gap-3">
                <h2 className="section-header">VOCES</h2>
                {SUELTAS.map((v) => (
                    <div key={v.name} className="flex items-center gap-3">
                        <button
                            type="button"
                            className="btn-terminal"
                            onClick={() => disparar(() => play(v.name), v.label)}
                        >
                            [{v.label}]
                        </button>
                        <span className="comment">{`// ${v.nota}`}</span>
                    </div>
                ))}

                <div className="flex items-center gap-3">
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
                        onClick={() => disparar(() => play('beep', { hz: 220, ms: 320 }), 'ERROR')}
                    >
                        [ERROR]
                    </button>
                    <span className="comment">{'// la bocinita · tiene que sonar barata'}</span>
                </div>
            </section>

            <hr className="rule-dashed" />

            <section className="flex flex-col gap-3">
                <h2 className="section-header">LA TECLA, CAPA POR CAPA</h2>
                <p className="comment">
                    {'// si suena mal hay que saber CUAL falla · mezcladas es imposible'}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    {KEY_LAYERS.map((capa) => (
                        <label key={capa} className="flex items-center gap-2">
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
                                // Directo a la voz y NO por `play`: acá interesa
                                // oír la capa suelta, y la compuerta de 60 ms
                                // está para la app, no para el diagnóstico.
                                const g = ensureAudio();
                                if (g) voiceKey(g, Math.random, capas);
                            }, `TECLA(${capas.join('+') || 'nada'})`)
                        }
                    >
                        [SONAR]
                    </button>
                </div>
            </section>

            <hr className="rule-dashed" />

            <section className="flex flex-col gap-3">
                <h2 className="section-header">EL GLITCH</h2>
                <label className="flex items-center gap-3">
                    <span className="diag-label">TEMBLOR</span>
                    <input
                        type="range"
                        min={1}
                        max={12}
                        value={temblor}
                        onChange={(e) => setTemblor(Number(e.target.value))}
                    />
                    <span className="diag-value tabular-nums">{temblor}px</span>
                </label>
                <div className="flex items-center gap-3">
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
                    <span className="comment">
                        {'// mas temblor = mas fuerte · como la imagen'}
                    </span>
                </div>
            </section>

            <hr className="rule-dashed" />

            <section className="flex flex-col gap-3">
                <h2 className="section-header">LA SALA</h2>
                <label className="flex items-center gap-3">
                    <span className="diag-label">CUARTO</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={sala}
                        onChange={(e) => setSala(Number(e.target.value))}
                    />
                    <span className="diag-value tabular-nums">{sala}%</span>
                </label>
                <p className="comment">
                    {'// a 0 es un navegador · a 50 es una habitacion · comparalo con la tecla'}
                </p>
            </section>

            <hr className="rule-dashed" />

            <section className="flex flex-col gap-3">
                <h2 className="section-header">A VELOCIDAD DE ESCRITURA</h2>
                <p className="comment">
                    {'// la prueba de verdad · aca actua la compuerta de 60 ms, como en la app'}
                </p>
                <textarea
                    className="editor-textarea"
                    rows={4}
                    placeholder="escribi aca, rapido, un parrafo entero"
                    onKeyDown={(e) => {
                        // Los modificadores solos no golpean ninguna tecla que
                        // haga ruido: pulsar Shift no suena, suena la letra.
                        if (e.key.length !== 1 && e.key !== 'Backspace' && e.key !== 'Enter') return;
                        despertar();
                        play('key');
                    }}
                />
            </section>

            <hr className="rule-dashed" />

            <section>
                <h2 className="section-header">EL PRESUPUESTO</h2>
                {Object.entries(PEAK_DBFS).map(([familia, db]) => (
                    <div key={familia} className="diag-row">
                        <span className="diag-label">{familia.toUpperCase()}</span>
                        <span className="diag-value tabular-nums">{db} dBFS</span>
                    </div>
                ))}
            </section>
        </main>
    );
}
