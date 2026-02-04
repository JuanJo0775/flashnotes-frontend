import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NoteEditor from '@/components/notes/NoteEditor';
import type { Note } from '@/types/note.types';

describe('NoteEditor - modal confirmación', () => {
    const baseNote: Note = {
        _id: '507f1f77bcf86cd799439011',
        title: 'Nota de prueba',
        content: 'Contenido'
    };

    test('abre y cierra el modal de confirmación', () => {
        const onSave = jest.fn().mockResolvedValue(baseNote);
        const onBack = jest.fn();
        const onUndo = jest.fn().mockResolvedValue(baseNote);
        const onRedo = jest.fn().mockResolvedValue(baseNote);
        const onMoveToTrash = jest.fn().mockResolvedValue(true);

        render(
            <NoteEditor
                note={baseNote}
                onSave={onSave}
                onBack={onBack}
                onUndo={onUndo}
                onRedo={onRedo}
                onMoveToTrash={onMoveToTrash}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /trash/i }));
        expect(screen.getByText(/mover a papelera/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
        expect(screen.queryByText(/mover a papelera/i)).not.toBeInTheDocument();
    });

    test('aceptar confirmación llama a onMoveToTrash y onBack', async () => {
        const onSave = jest.fn().mockResolvedValue(baseNote);
        const onBack = jest.fn();
        const onUndo = jest.fn().mockResolvedValue(baseNote);
        const onRedo = jest.fn().mockResolvedValue(baseNote);
        const onMoveToTrash = jest.fn().mockResolvedValue(true);

        render(
            <NoteEditor
                note={baseNote}
                onSave={onSave}
                onBack={onBack}
                onUndo={onUndo}
                onRedo={onRedo}
                onMoveToTrash={onMoveToTrash}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /trash/i }));
        fireEvent.click(screen.getByRole('button', { name: /aceptar/i }));

        await waitFor(() => {
            expect(onMoveToTrash).toHaveBeenCalledWith(baseNote._id);
            expect(onBack).toHaveBeenCalledTimes(1);
        });
    });
});
