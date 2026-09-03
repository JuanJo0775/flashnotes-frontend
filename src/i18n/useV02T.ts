// src/i18n/useV02T.ts
'use client';

import { useT, translate, type TranslationKey, type Vars } from '@/i18n';
import { useSystemState } from '@/hooks/useSystemState';
import { v02Label } from '@/lib/system/v02';

/**
 * El traductor, pero de una versión que nadie terminó.
 *
 * Fuera de la v0.2 es `useT()` sin más. Dentro, una de cada cuatro etiquetas
 * sale mal — sin traducir, con el nombre de la variable, o traducida palabra por
 * palabra sin mirar qué era.
 *
 * SE ELIGE POR CLAVE Y NO AL AZAR: la misma etiqueta se rompe siempre igual. Si
 * cambiara en cada repintado, la interfaz sería un cartel de neón parpadeando y
 * dejaría de leerse como una versión vieja para leerse como una avería.
 *
 * La versión sin traducir sale del diccionario inglés de verdad, no de una
 * inventada: es exactamente la cadena que habría quedado si nadie la hubiera
 * tocado.
 */
export function useV02T() {
    const t = useT();
    const { v02 } = useSystemState();

    return (key: TranslationKey, vars?: Vars): string => {
        const ok = t(key, vars);
        if (!v02) return ok;

        return v02Label(key, { ok, raw: translate('en', key, vars) });
    };
}
