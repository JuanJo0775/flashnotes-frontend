// tests/components/layout/HeaderTabs.test.tsx

/**
 * LA PESTAÑA ABIERTA SE VE ABIERTA.
 *
 * `activeTab` estaba escrito como «trash, y si no, notas», y funcionó mientras
 * sólo hubo dos pestañas. Al aparecer la colección, su vista se pintaba pero la
 * marca de «acá estás» se quedaba en NOTAS: la pantalla decía una cosa y la
 * cabecera otra.
 *
 * El editor SÍ tiene que marcar NOTAS, porque es una sub-vista suya. Lo que no
 * puede es tragarse todo lo que no reconoce.
 */

import { render, screen } from '@testing-library/react';
import Header from '@/components/layout/Header';

const pintar = (view: 'notes' | 'trash' | 'collection' | 'editor') =>
    render(
        <Header
            currentView={view}
            onViewChange={() => {}}
            trashCount={0}
            collectionCount={3}
        />
    );

const abierta = () =>
    screen
        .getAllByRole('button')
        .find((b) => b.getAttribute('aria-current') === 'page')
        ?.textContent ?? '';

test('en la colección, la pestaña marcada es la colección', () => {
    pintar('collection');
    expect(abierta()).toContain('★');
});

test('en la papelera, la papelera', () => {
    pintar('trash');
    expect(abierta()).toMatch(/PAPELERA|TRASH/i);
});

test('en las notas, las notas', () => {
    pintar('notes');
    expect(abierta()).toMatch(/NOTAS|NOTES/i);
});

test('el editor sigue marcando notas: es una sub-vista suya', () => {
    pintar('editor');
    expect(abierta()).toMatch(/NOTAS|NOTES/i);
});

test('nunca hay dos pestañas marcadas a la vez', () => {
    for (const v of ['notes', 'trash', 'collection', 'editor'] as const) {
        const { unmount } = pintar(v);

        const marcadas = screen
            .getAllByRole('button')
            .filter((b) => b.getAttribute('aria-current') === 'page');

        expect(marcadas).toHaveLength(1);
        unmount();
    }
});
