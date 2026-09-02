// tests/lib/system/secretsCount.test.ts

/**
 * EL CONTADOR DEL PANEL TIENE QUE PODER LLEGAR A SU PROPIO TOTAL.
 *
 * `SECRETOS_HALLADOS 7/24` es una promesa: existen veinticuatro y podés
 * encontrarlos todos. Si uno de esos identificadores no se marca en ninguna
 * parte, el contador **nunca llega al final** — y quien lo persiga va a buscar
 * durante horas algo que no está.
 *
 * Es el mismo defecto que el umbral de diez colapsos, sólo que peor: acá la app
 * te dice a la cara cuántos faltan.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';


import { SECRET_IDS } from '@/hooks/useSystemState';

/** Todo el código fuente, de una vez: los secretos se marcan desde muchos sitios. */
const RAIZ = join(process.cwd(), 'src');

const FUENTE = readdirSync(RAIZ, { recursive: true, encoding: 'utf8' })
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => readFileSync(join(RAIZ, f), 'utf8'))
    .join('\n');

describe('cada secreto del contador se puede encontrar', () => {
    it.each(SECRET_IDS.map((id) => [id]))('«%s» se marca en alguna parte', (id) => {
        // Se busca la marca, no la declaración: estar en la lista es lo que lo
        // hace contar, y marcarlo es lo único que lo hace alcanzable.
        const marcado =
            FUENTE.includes(`markSecretFound('${id}')`) ||
            FUENTE.includes(`secretId: '${id}'`);

        expect(marcado).toBe(true);
    });

    it('no hay marcas de secretos que no estén en la lista', () => {
        // Al revés también rompe: marcar un identificador que la lista no
        // conoce no suma, y el hallazgo se pierde sin que nadie se entere.
        const marcados = [...FUENTE.matchAll(/markSecretFound\('([\w-]+)'\)/g)]
            .map((m) => m[1])
            .concat(
                [...FUENTE.matchAll(/secretId: '([\w-]+)'/g)].map((m) => m[1])
            );

        for (const id of new Set(marcados)) {
            expect(SECRET_IDS).toContain(id);
        }
    });

    it('los identificadores no se repiten', () => {
        expect(new Set(SECRET_IDS).size).toBe(SECRET_IDS.length);
    });
});
