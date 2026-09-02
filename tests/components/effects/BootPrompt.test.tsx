// tests/components/effects/BootPrompt.test.tsx
import { render, screen, act } from '@testing-library/react';
import BootPrompt from '@/components/effects/BootPrompt';

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
    act(() => {
        jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
});

const TEXTO = 'HOLA';

describe('BootPrompt - el motor de tecleo', () => {
    test('teclea el texto carácter a carácter', async () => {
        render(<BootPrompt text={TEXTO} />);

        // Antes de empezar no hay nada escrito.
        expect(screen.queryByText(TEXTO)).not.toBeInTheDocument();

        await act(async () => {
            await jest.advanceTimersByTimeAsync(1000);
        });

        expect(screen.getByText(TEXTO)).toBeInTheDocument();
    });

    test('acepta otros tiempos para reutilizarlo con otro ritmo', async () => {
        render(<BootPrompt text={TEXTO} typeMs={1} wakeMs={0} />);

        await act(async () => {
            await jest.advanceTimersByTimeAsync(20);
        });

        expect(screen.getByText(TEXTO)).toBeInTheDocument();
    });

    test('avisa cuando termina el arco entero', async () => {
        const onDone = jest.fn();
        render(
            <BootPrompt
                text={TEXTO}
                wakeMs={0}
                typeMs={1}
                holdMs={10}
                eraseMs={1}
                onDone={onDone}
            />
        );

        await act(async () => {
            await jest.advanceTimersByTimeAsync(200);
        });

        expect(onDone).toHaveBeenCalledTimes(1);
    });

    test('sin onDone no se rompe al terminar', async () => {
        render(<BootPrompt text={TEXTO} wakeMs={0} typeMs={1} holdMs={5} eraseMs={1} />);

        await expect(
            act(async () => {
                await jest.advanceTimersByTimeAsync(200);
            })
        ).resolves.not.toThrow();
    });
});
