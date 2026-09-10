// tests/lib/system/audio/cotidiano.test.ts

/**
 * LO QUE PASA CON LAS NOTAS, QUE ERA LO ÚNICO MUDO DEL USO NORMAL.
 *
 * ⚠ SALIÓ DE LA AUDITORÍA, y el hallazgo dolía: todo lo espectacular sonaba
 * —el colapso, el bloqueo, el §26, el pong— y tirar una nota, que es el único
 * acto destructivo de un día cualquiera, sonaba igual que abrir una pestaña.
 *
 * ⚠ Y NO HIZO FALTA TOCAR LA APP. Las dos cuentas ya estaban publicadas en el
 * almacén del sistema —`noteTrashedAt` para la barra de estado, `permanentDeletes`
 * para el secreto del recuento— y el suscriptor ya escuchaba ese almacén por los
 * hallazgos. Ni un `play()` suelto en un componente.
 */

import { startSound } from '@/lib/system/audio/wire';
import { teardownAudio } from '@/lib/system/audio/context';
import { markNoteTrashed, registerPermanentDelete } from '@/hooks/useSystemState';
import { installFakeAudio, lastContext, type FakeNode } from './fakeAudio';

let quitarFalso: () => void;
let parar: () => void;

beforeEach(() => {
    localStorage.clear();
    quitarFalso = installFakeAudio();
    parar = startSound();
});

afterEach(() => {
    parar();
    teardownAudio();
    quitarFalso();
    document.body.replaceChildren();
});

const unTic = () => new Promise((r) => setTimeout(r, 90));

/** Cuántos nodos hay, o cero si aún no nació el contexto. */
const marca = () => lastContext()?.created.length ?? 0;

const nuevos = (desde: number): FakeNode[] =>
    (lastContext()?.created ?? []).slice(desde);

/**
 * Deja el ambiente ya encendido antes de medir.
 *
 * El zumbido son seis osciladores: si arranca DENTRO de la ventana que se está
 * midiendo, se cuela en la cuenta y un golpe parece una orquesta.
 */
function conLaSalaYaEncendida() {
    const area = document.createElement('textarea');
    document.body.append(area);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    area.remove();
}

describe('tirar una nota a la papelera', () => {
    it('⚠ suena: algo cae dentro del cesto', async () => {
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        markNoteTrashed();
        await unTic();

        expect(nuevos(antes).length).toBeGreaterThan(0);
    });

    it('⚠ y es un impacto, no un barrido', async () => {
        /*
         * En el §26 este mismo golpe llega DETRÁS de un barrido: es lo que toca
         * el suelo después de que algo cae. Acá va solo, porque una nota tirada
         * no se cae de la pantalla — la dejás caer.
         *
         * Se mide por oscilador: el impacto es un seno grave, y un barrido
         * traería el suyo con una rampa larga. Si alguien cambiara la voz por
         * `sweep`, este test lo dice.
         */
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        markNoteTrashed();
        await unTic();

        const osc = nuevos(antes).filter((n) => n.kind === 'oscillator');
        expect(osc.length).toBeGreaterThan(0);
        expect(osc[0].frequency!.value).toBeLessThan(120);
    });
});

describe('y borrarla del todo', () => {
    it('⚠ suena distinto: el cajón se cierra', async () => {
        /*
         * Es el MISMO cajón del premio, al revés. Tirar a la papelera se puede
         * deshacer y por eso no suena a final; esto no se deshace.
         *
         * Se mide contra el otro: el cajón lleva madera —ruido filtrado— además
         * del tope, y el impacto de la papelera no tiene ni un grano.
         */
        conLaSalaYaEncendida();
        await unTic();
        const antes = marca();

        registerPermanentDelete();
        await unTic();

        const nuevas = nuevos(antes);
        expect(nuevas.filter((n) => n.kind === 'bufferSource').length).toBeGreaterThan(0);
        expect(nuevas.filter((n) => n.kind === 'oscillator').length).toBeGreaterThan(0);
    });

    it('⚠ y no es lo mismo sonando dos veces: miden distinto', async () => {
        /*
         * La comprobación al revés, que es la que sostiene que sean dos cosas.
         *
         * ⚠ Y SE MIDE POR TONO, NO POR RUIDO. La primera versión de este test
         * exigía que la papelera no trajera nada de ruido filtrado —«la
         * madera»— y fallaba: el impacto TAMBIÉN lleva su grano. Medido: el
         * cesto son 37 Hz con 441 ms de cola, y el tope del cajón 93 Hz en 160.
         *
         * O sea que lo que los separa no es de qué están hechos, es la ALTURA y
         * la cola: uno es un suelo que retumba y el otro es madera que choca.
         */
        conLaSalaYaEncendida();
        await unTic();

        const tono = (fn: () => void) => {
            const antes = marca();
            fn();
            const osc = nuevos(antes).filter((n) => n.kind === 'oscillator');
            return osc[0].frequency!.value;
        };

        const cesto = tono(markNoteTrashed);
        const cajon = tono(registerPermanentDelete);

        expect(cesto).toBeLessThan(60);
        expect(cajon).toBeGreaterThan(70);
    });
});
