'use client';

import { useLocalIdentity } from '@/hooks/useLocalIdentity';
import { useNotes } from '@/hooks/useNotes';

export default function Home() {
  const { browserId, isReady } = useLocalIdentity();
  const { notes, isLoading, createNote } = useNotes();

  if (!isReady) {
    return (
        <div className="flex min-h-screen items-center justify-center">
          <p>Inicializando tu cuaderno...</p>
        </div>
    );
  }

  const handleCreateNote = async () => {
    try {
      await createNote('Nueva nota', 'Escribe aquí...');
    } catch (error) {
      console.error('Error creando nota:', error);
    }
  };

  return (
      <div className="flex min-h-screen flex-col p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">FlashNotes</h1>
          <p className="text-sm text-zinc-500 mt-2">
            Tu cuaderno personal en este navegador
          </p>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            ID: {browserId.substring(0, 8)}...
          </p>
        </header>

        <div className="mb-4">
          <button
              onClick={handleCreateNote}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            + Nueva Nota
          </button>
        </div>

        {isLoading ? (
            <p>Cargando notas...</p>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                  <div
                      key={note._id}
                      className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                  >
                    <h3 className="font-semibold mb-2">{note.title}</h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {note.content}
                    </p>
                    <p className="text-xs text-zinc-400 mt-2">
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
              ))}
            </div>
        )}

        {!isLoading && notes.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>No hay notas aún. ¡Crea tu primera nota!</p>
            </div>
        )}
      </div>
  );
}