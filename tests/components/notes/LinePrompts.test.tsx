import { render } from '@testing-library/react';
import { createRef } from 'react';
import LinePrompts from '@/components/notes/LinePrompts';

/**
 * La regla del prompt:
 *   · primera línea      → SIEMPRE, aunque esté vacía
 *   · línea con texto    → sí
 *   · línea vacía        → no
 *   · continuación por ajuste de ancho → no (no es una línea lógica)
 */
function pintar(value: string) {
    const ref = createRef<HTMLTextAreaElement>();
    const { container } = render(<LinePrompts textareaRef={ref} value={value} />);
    const lineas = [...container.querySelectorAll('.editor-line')];
    return {
        totalLineas: lineas.length,
        conPrompt: lineas.map((l) => l.classList.contains('has-prompt')),
    };
}

describe('LinePrompts', () => {
    test('una sola línea con texto lleva prompt', () => {
        expect(pintar('hola').conPrompt).toEqual([true]);
    });

    test('la primera línea lleva prompt aunque esté vacía', () => {
        expect(pintar('').conPrompt).toEqual([true]);
    });

    test('las líneas vacías intermedias no llevan prompt', () => {
        expect(pintar('uno\n\ndos').conPrompt).toEqual([true, false, true]);
    });

    test('varias vacías seguidas siguen sin llevar prompt', () => {
        expect(pintar('uno\n\n\n\ndos').conPrompt).toEqual([
            true,
            false,
            false,
            false,
            true,
        ]);
    });

    test('una línea final vacía no lleva prompt', () => {
        expect(pintar('uno\n').conPrompt).toEqual([true, false]);
    });

    test('hay un bloque por línea lógica, no por fila visual', () => {
        // Una línea muy larga es UNA sola línea lógica: se parte al pintarse,
        // pero sigue siendo un único bloque con un único prompt.
        const larga = 'palabra '.repeat(300);
        const r = pintar(`corta\n${larga}\notra`);

        expect(r.totalLineas).toBe(3);
        expect(r.conPrompt).toEqual([true, true, true]);
    });

    test('los guiones seguidos no alteran la regla', () => {
        // Regresión: escribir series de guiones descuadraba los prompts.
        expect(pintar('---\n-----\n\n-------').conPrompt).toEqual([
            true,
            true,
            false,
            true,
        ]);
    });

    test('la línea vacía ocupa fila igual, con un carácter invisible', () => {
        const ref = createRef<HTMLTextAreaElement>();
        const { container } = render(<LinePrompts textareaRef={ref} value={'a\n\nb'} />);
        const vacia = container.querySelectorAll('.editor-line')[1];

        expect(vacia.textContent).toBe('\u200b');
    });
});
