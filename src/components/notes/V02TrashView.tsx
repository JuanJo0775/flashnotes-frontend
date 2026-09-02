// src/components/notes/V02TrashView.tsx
'use client';

import { useSyncExternalStore, useState } from 'react';
import { renderTrashLine } from '@/lib/system/v02TrashLine';
import { v02Notice } from '@/lib/system/v02Messages';
import {
    subscribeV02Notes,
    readV02Trashed,
    restoreV02Note,
    purgeV02Note,
} from '@/lib/system/v02Notes';
import { useLang } from '@/i18n';
import { useV02T } from '@/i18n/useV02T';

/**
 * La papelera de la v0.2.
 *
 * **Es la suya**, no la de verdad. Hasta acá esta pantalla enseñaba la papelera
 * del backend, con notas reales dentro: rompía lo único que sostiene la pieza
 * —dos versiones con archivos distintos— y ponía trabajo de verdad al alcance de
 * una interfaz que presume de fallar.
 *
 * Y funciona A MEDIAS, que es lo que significa una versión sin terminar:
 *
 * - Tirar una nota a veces **no hace nada** (falla hacia no borrar, siempre).
 * - Recuperarla la devuelve **corrompida la mitad de las veces**, con basura
 *   metida entre las líneas y el texto original entero ahí dentro.
 * - Y entre esa basura, muy de vez en cuando, **asoma un comando** de los que
 *   sólo existen acá y no salen en ninguna ayuda.
 *
 * Lo de arriba es lo que HACE. Lo de abajo es cómo se ve: una columna, el
 * nombre, puntos hasta el borde, los bytes crudos, y dos acciones que son texto
 * con un `>` delante. Ni rejilla, ni vista previa, ni tamaños bonitos, ni
 * diálogo de confirmación — todo eso llegó después.
 */
export default function V02TrashView() {
    const lang = useLang();

    // `useV02T` y no `useT`: estas etiquetas también tienen que poder salir mal
    // traducidas, como el resto de la versión. Elegir el idioma a mano con un
    // ternario las dejaría fuera del sistema — y hay un test que lo prohíbe.
    const t = useV02T();

    const tiradas = useSyncExternalStore(
        subscribeV02Notes,
        readV02Trashed,
        () => VACIO
    );

    const [aviso, setAviso] = useState<string | null>(null);

    const recuperar = (id: string) => {
        const salida = restoreV02Note(id);
        if (!salida) return;

        // El aviso NO dice si venía un comando. Decirlo sería señalarlo con el
        // dedo, y lo que se busca es que alguien lo encuentre leyendo.
        setAviso(
            v02Notice(salida.corrupted ? 'restoreDirty' : 'noop', lang)
        );
    };

    const borrar = (id: string) => {
        purgeV02Note(id);
        setAviso(null);
    };

    return (
        // SIN CAJA PROPIA: el área principal ya dibuja la suya alrededor de
        // esta vista, y dos marcos seguidos se leen como un error de
        // maquetación, que es distinto de una versión vieja.
        <div className="v02-trash">
            {tiradas.length === 0 ? (
                <pre className="v02-empty">{v02Notice('listEmpty', lang)}</pre>
            ) : (
                <ul className="v02-trash-list">
                    {tiradas.map((nota) => (
                        <li key={nota._id}>
                            <pre aria-hidden="true">
                                {renderTrashLine(
                                    nota.title,
                                    (nota.content ?? '').length
                                )}
                            </pre>

                            {/* Las acciones son TEXTO, con un `>` delante. Un
                                botón con borde y fondo es cromo de una versión
                                que todavía no lo tenía. */}
                            <div className="v02-trash-acts">
                                <button
                                    type="button"
                                    onClick={() => recuperar(nota._id)}
                                >
                                    {t('trash.v02Restore')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => borrar(nota._id)}
                                >
                                    {t('trash.v02Delete')}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {aviso && <pre className="v02-notice">{aviso}</pre>}
        </div>
    );
}

/** Referencia constante: el servidor no tiene papelera, y si cambiara en cada
 *  lectura el hook entraría en bucle (REGLAS · C2). */
const VACIO: never[] = [];
