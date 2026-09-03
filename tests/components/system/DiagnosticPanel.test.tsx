// tests/components/system/DiagnosticPanel.test.tsx
// Testing Library registra su limpieza automática con un `afterEach` al ser
// importada, y acá se importa DENTRO de cada test, donde Jest no admite hooks
// nuevos. Con esto no los registra y la limpieza se hace a mano más abajo.
process.env.RTL_SKIP_AUTO_CLEANUP = 'true';

/**
 * El panel lee del almacén de módulo, cuyo estado sobreviviría entre tests. Se
 * carga todo de cero en cada uno: así el componente y el almacén que consulta
 * son siempre el mismo par recién inicializado.
 *
 * Testing Library se importa DENTRO del mismo registro aislado a propósito. Con
 * `jest.resetModules()`, el componente recibe una copia nueva de React; si el
 * `render` viniera de la copia original, serían dos Reacts distintos y el
 * primer hook del componente reventaría con "cannot read properties of null".
 */
async function load() {
    jest.resetModules();
    const [{ default: DiagnosticPanel }, store, rtl] = await Promise.all([
        import('@/components/system/DiagnosticPanel'),
        import('@/hooks/useSystemState'),
        import('@testing-library/react'),
    ]);
    return { DiagnosticPanel, store, ...rtl };
}

const props = {
    open: true,
    onClose: () => {},
    notesCount: 12,
    bytesWritten: 8400,
    charsPerMinute: 0,
};

beforeEach(() => {
    localStorage.clear();
    // La limpieza automática de Testing Library se registra al importarla, y
    // acá se importa dentro de cada test: se limpia a mano.
    document.body.innerHTML = '';
});

describe('DiagnosticPanel - lecturas', () => {
    test('cerrado no se muestra', async () => {
        // Un <dialog> cerrado conserva sus hijos en el DOM; lo que lo oculta es
        // el `display: none` del navegador, que jsdom no aplica. Lo que hay que
        // comprobar es que el diálogo NO está abierto, no que su contenido no
        // exista — es lo mismo que vale para ConfirmDialog.
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} open={false} />);

        expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
    });

    test('muestra cuántas notas hay', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText('NOTAS CREADAS')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
    });

    test('la sesión no se puede leer, y lo dice', async () => {
        // La cookie es httpOnly: el panel no inventa un dato que no tiene.
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText('NO LEGIBLE')).toBeInTheDocument();
    });

    test('el tiempo activo se lee como un reloj', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeInTheDocument();
    });

    test('la integridad se muestra en porcentaje', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('el núcleo se muestra en grados', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText(/\d+°C/)).toBeInTheDocument();
    });

    test('el núcleo sube si venís escribiendo rápido', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        const { rerender } = render(<DiagnosticPanel {...props} charsPerMinute={0} />);
        const reposo = screen.getByText(/°C$/).textContent;

        rerender(<DiagnosticPanel {...props} charsPerMinute={300} />);

        expect(screen.getByText(/°C$/).textContent).not.toBe(reposo);
    });
});

describe('DiagnosticPanel - el contador de secretos', () => {
    test('el denominador sale del registro, no de un número a mano', async () => {
        const { DiagnosticPanel, store, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(
            screen.getByText(new RegExp(`/${store.SECRET_IDS.length}$`))
        ).toBeInTheDocument();
    });

    test('abrir el panel ya cuenta como haberlo encontrado', async () => {
        // Nadie puede ver el contador en 0: para leerlo tuviste que llegar acá.
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByText(/^1\/\d+$/)).toBeInTheDocument();
    });

    test('estando cerrado no marca nada', async () => {
        const { DiagnosticPanel, store, render } = await load();

        render(<DiagnosticPanel {...props} open={false} />);

        expect(store.getSystemState().secretsFound).toBe(0);
    });
});

describe('DiagnosticPanel - el interruptor de efectos', () => {
    test('arranca encendido', async () => {
        const { DiagnosticPanel, render, screen } = await load();

        render(<DiagnosticPanel {...props} />);

        expect(screen.getByRole('button', { name: /efectos/i })).toHaveTextContent(
            '[EFECTOS: ON]'
        );
    });

    test('pulsarlo los apaga', async () => {
        const { DiagnosticPanel, store, render, screen, fireEvent } = await load();

        render(<DiagnosticPanel {...props} />);
        fireEvent.click(screen.getByRole('button', { name: /efectos/i }));

        expect(store.getSystemState().effectsEnabled).toBe(false);
        expect(screen.getByRole('button', { name: /efectos/i })).toHaveTextContent(
            '[EFECTOS: OFF]'
        );
    });

    test('la elección se recuerda', async () => {
        const primera = await load();
        primera.render(<primera.DiagnosticPanel {...props} />);
        primera.fireEvent.click(
            primera.screen.getByRole('button', { name: /efectos/i })
        );

        const segunda = await load();

        expect(segunda.store.getSystemState().effectsEnabled).toBe(false);
    });
});

describe('DiagnosticPanel - cerrar', () => {
    test('Escape avisa al padre', async () => {
        const { DiagnosticPanel, render, screen, fireEvent } = await load();
        const onClose = jest.fn();

        render(<DiagnosticPanel {...props} onClose={onClose} />);
        fireEvent(
            screen.getByRole('dialog', { hidden: true }),
            new Event('cancel', { bubbles: false, cancelable: true })
        );

        expect(onClose).toHaveBeenCalled();
    });

    test('el botón de cerrar avisa al padre', async () => {
        const { DiagnosticPanel, render, screen, fireEvent } = await load();
        const onClose = jest.fn();

        render(<DiagnosticPanel {...props} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));

        expect(onClose).toHaveBeenCalled();
    });
});
