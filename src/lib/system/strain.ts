// src/lib/system/strain.ts

/**
 * Lo que le cuesta a la máquina lo que le está pasando.
 *
 * El panel decía `INTEGRIDAD 100%` y `NÚCLEO 38 °C` con la señal cromática rota,
 * con tirones cayendo solos y con el rótulo aporreado. Un instrumento que marca
 * lo mismo pase lo que pase no es un instrumento: es un adorno con números.
 *
 * Y el panel es el ÚNICO SITIO de la app donde se puede medir lo que ocurre. Si
 * no se mueve, la avería no tiene testigo — pasa, se ve, y no queda registrada
 * en ninguna parte.
 *
 * DOS LECTURAS Y NO UNA, y van en direcciones contrarias a propósito: la
 * integridad dice cuánto queda sano y BAJA; el núcleo dice cuánto está costando
 * y SUBE. Una sola lectura no distinguiría «roto» de «forzado».
 *
 * Todo puro: se le pasa lo que está pasando y devuelve el número. Ni lee estado
 * ni sortea nada.
 */

import { CORE_MAX_C, CORE_MIN_C } from '@/lib/system/diagnostics';

export interface Strain {
    /** La señal cromática está rota. Es la avería que no se va sola. */
    chromaticFailure: boolean;
    /** Hay un tirón AHORA MISMO. Pasa y vuelve. */
    glitching: boolean;
    /** Cuántas veces se le ha pegado al rótulo, dentro de la ventana. */
    clicks: number;
}

/** Lo que se lleva cada cosa de la integridad. */
const POR_SENAL_ROTA = 18;
const POR_TIRON = 7;
const POR_CLIC = 3;

/**
 * La integridad, con el desgaste de lo que esté roto encima.
 *
 * ⚠ NO SUSTITUYE LA QUE VIENE DADA. El rótulo ya la baja por su cuenta al
 * aporrearlo, en escalones fijos; esto le RESTA además lo que cueste lo que esté
 * pasando. Sustituirla borraría lo que el rótulo acaba de hacer.
 *
 * El tirón resta pero no daña: mientras dura, baja; cuando pasa, vuelve. Una
 * caída que no volviera diría que el tirón rompió algo, y no rompe nada.
 */
export function strainedIntegrity(base: number, strain: Strain): number {
    const castigo =
        (strain.chromaticFailure ? POR_SENAL_ROTA : 0) +
        (strain.glitching ? POR_TIRON : 0) +
        Math.max(0, strain.clicks) * POR_CLIC;

    return Math.max(0, Math.min(100, Math.round(base - castigo)));
}

/** Lo que suma cada cosa al núcleo. Forzar la máquina la calienta. */
const CALOR_SENAL_ROTA = 9;
const CALOR_TIRON = 4;
const CALOR_CLIC = 2;

/**
 * La temperatura, con lo que cueste lo que esté pasando.
 *
 * Sube donde la integridad baja, y ésa es toda la diferencia entre las dos: una
 * mide lo que queda sano, la otra lo que se está gastando en sostenerlo.
 *
 * Recortada a la escala del panel: la barra se dibuja contra estos dos extremos
 * y pasarse la rompería.
 */
export function strainedCore(base: number, strain: Strain): number {
    const extra =
        (strain.chromaticFailure ? CALOR_SENAL_ROTA : 0) +
        (strain.glitching ? CALOR_TIRON : 0) +
        Math.max(0, strain.clicks) * CALOR_CLIC;

    return Math.max(CORE_MIN_C, Math.min(CORE_MAX_C, Math.round(base + extra)));
}
