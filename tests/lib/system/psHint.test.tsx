// tests/lib/system/psHint.test.ts

/**
 * `//ps` SE ENCUENTRA MIRANDO, NO INSISTIENDO.
 *
 * Es una PUERTA —desbloquea `//attach_6`— así que se sacó de la fuga de `//help`:
 * regalarla es regalar la capa que abre. Pero entonces no quedaba NINGUNA forma
 * de llegar a ella, y un comando que no se puede encontrar es un comando que no
 * existe.
 *
 * La pista vive al lado del título del panel de diagnóstico, en gris y a la
 * derecha, envuelta en barras: `//ps//` se lee como un adorno de cabecera de esos
 * que ponen los programas viejos. El comando son los cuatro primeros caracteres,
 * enteros y tecleables — un `// ps` con espacio sería más bonito y no serviría
 * para nada.
 *
 * Ésa es la diferencia entre una pista y un cartel: quien mira, la ve.
 */

import { render, screen } from '@testing-library/react';
import DiagnosticPanel from '@/components/system/DiagnosticPanel';
import { LEAKABLE } from '@/lib/system/commands';

describe('la pista del panel', () => {
    it('lleva el comando ENTERO, para que se pueda teclear', () => {
        render(<DiagnosticPanel open onClose={() => {}} notesCount={0} bytesWritten={0} charsPerMinute={0} />);

        expect(screen.getByTestId('diag-leftover')).toHaveTextContent('//ps');
    });

    it('y envuelto, para que no se lea como una instrucción', () => {
        // `//ps//` parece un adorno de cabecera. `//ps` a secas, junto al
        // título, sería un cartel que dice «tecleá esto».
        render(<DiagnosticPanel open onClose={() => {}} notesCount={0} bytesWritten={0} charsPerMinute={0} />);

        expect(screen.getByTestId('diag-leftover').textContent).toBe('//ps//');
    });
});

describe('y por eso //ps NO se filtra', () => {
    it('la fuga no lo suelta, ni a él ni a lo que abre', () => {
        expect(LEAKABLE).not.toContain('//ps');
        expect(LEAKABLE).not.toContain('//attach_6');
    });
});
