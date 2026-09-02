// src/i18n/en.ts

import type { Dictionary } from './types';

/**
 * The English dictionary.
 *
 * This is NOT a word-for-word translation of `es.ts`. The Spanish is written in
 * a Rioplatense register with a deliberate voice — tired, dry, on your side. The
 * English aims for the same VOICE, not the same words: short imperatives, no
 * exclamation marks, no cheerfulness. When a phrase would only work in Spanish,
 * the English says the equivalent thing its own way.
 *
 * The type annotation is what keeps the two files in step: a missing key or a
 * typo in a key is a compile error, not a blank space in the UI.
 */
export const en: Dictionary = {
    // ── common ───────────────────────────────────────────────────────────────
    'common.untitled': 'Untitled.txt',
    'common.empty': '(empty)',
    'common.loading': '[...] Loading',
    'common.dash': '—',

    // ── header and navigation ────────────────────────────────────────────────
    'nav.notes': 'Notes',
    'nav.trash': 'Trash',
    'nav.viewsLabel': 'Views',
    'nav.dateLabel': 'DATE',
    'nav.datePlaceholder': '----.--.--',

    // ── theme ────────────────────────────────────────────────────────────────
    'theme.dark': 'DARK',
    'theme.light': 'LIGHT',
    'theme.switchTo': 'Switch to {mode} theme',
    'theme.status': '{mode} theme. Press to switch to {other}.',
    'theme.modeDark': 'dark',
    'theme.modeLight': 'light',
    'theme.signalLost': '[✗ SIGNAL]',
    'theme.signalLostTitle': 'Video signal lost. Reload the page.',
    'theme.signalLostStatus': 'Signal lost. Reload the page to get the theme switch back.',

    // ── language ─────────────────────────────────────────────────────────────
    'lang.code': 'EN',
    'lang.switchTo': 'Switch the language to Spanish',
    'lang.status': 'Language: English. Press to switch to Spanish.',

    // ── sidebar ──────────────────────────────────────────────────────────────
    'sidebar.selectFile': 'Select_file',
    'sidebar.newNote': '[+] New note',
    'sidebar.empty': 'No files',
    'sidebar.loadMore': '[↓] Load more ({n})',
    'sidebar.files': 'files',
    'sidebar.noTime': '--:--:--',

    // ── notes list ───────────────────────────────────────────────────────────
    'list.loading': '[LOADING',
    'list.loadingDetail': 'Retrieving files from the system',
    'list.emptyBanner': '[SYSTEM_EMPTY]',
    'list.emptyLine1': 'There are no files in the system.',
    'list.emptyLine2': 'Write the first one to begin.',
    'list.createFirst': '[+] Create first file',
    'list.available': 'Available_files',
    'list.newFile': '[+] New file',
    'list.loadMore': '[↓] Load {n} more',

    // ── note card ────────────────────────────────────────────────────────────
    'card.open': '[Open →]',

    // ── relative time ────────────────────────────────────────────────────────
    'time.now': 'now',

    // ── editor ───────────────────────────────────────────────────────────────
    'editor.back': '[←] Back',
    'editor.saving': 'Saving…',
    'editor.saved': 'Saved',
    'editor.notSaved': 'Not saved',
    'editor.core': 'Editor_core',
    'editor.titlePlaceholder': 'File_name.txt',
    'editor.contentLabel': 'Note content',
    'editor.bootPlaceholder': 'The user starts writing here…',
    'editor.quickActions': 'Quick_actions',
    'editor.undo': '[↶] Undo',
    'editor.undoTitle': 'Undo (Ctrl+Z)',
    'editor.redo': '[↷] Redo',
    'editor.redoTitle': 'Redo (Ctrl+Y)',
    'editor.trash': '[↧] Trash',
    'editor.trashTitle': 'Move to trash',
    'editor.overLimit':
        "This note is over {max} characters and can't be saved. Trim {excess}.",
    'editor.newNoteTitle': 'New note',

    // ── dialogs ──────────────────────────────────────────────────────────────
    'dialog.cancel': '[✗] Cancel',
    'dialog.trashTitle': '⚠ Move to trash',
    'dialog.trashMessage': 'The note will be moved to the trash. You can restore it there.',
    'dialog.trashConfirm': '[✓] Move',
    'dialog.deleteTitle': '⚠ Delete permanently',
    'dialog.deleteConfirm': '[X] Delete',

    // ── trash ────────────────────────────────────────────────────────────────
    'trash.empty': 'The trash is empty.',
    'trash.deleted': 'Deleted',
    'trash.restore': '[↶] Restore',
    'trash.delete': '[X] Delete',
    'trash.busy': '[...]',
    'trash.systemFile': 'System',

    // ── status bar ───────────────────────────────────────────────────────────
    'status.noNet': '[NO_NET]',
    'status.reconnected': '[RECONNECTED · {duration} IN THE DARK]',
    'status.serverDown': '[SERVER_NOT_RESPONDING]',
    'status.error': '[ERROR]',
    'status.loading': '[LOADING',
    'status.ok': '[SYSTEM_OK]',
    'status.saving': '[SAVING',
    'status.saved': '[SAVED]',
    'status.notSaved': '[NOT_SAVED]',
    'status.files': 'FILES: {n}',
    'status.noteSize': '[NOTE {used}/{max}]',
    'status.noteUsage': 'Space used in the open note',

    // ── diagnostics panel ────────────────────────────────────────────────────
    'diag.title': '⚙ System diagnostics',
    'diag.session': 'SESSION',
    'diag.unreadable': 'NOT READABLE',
    'diag.uptime': 'UPTIME',
    'diag.notesCreated': 'NOTES CREATED',
    'diag.bytesWritten': 'BYTES WRITTEN',
    'diag.integrity': 'INTEGRITY',
    'diag.theme': 'THEME',
    'diag.secrets': 'SECRETS',
    'diag.core': 'CORE',
    'diag.coreMeter': 'Core temperature: {temp} of {max} degrees',
    'diag.effects': '[EFFECTS: {state}]',
    'diag.close': '[✗] Close',

    // ── client-side validation ───────────────────────────────────────────────
    'valid.titleNotText': 'The title must be text',
    'valid.titleEmpty': "The title can't be empty",
    'valid.titleTooLong': "The title can't be longer than {max} characters",
    'valid.titleNewline': "The title can't contain line breaks",
    'valid.titleMarkup': "The title can't contain < or >",
    'valid.contentNotText': 'The content must be text',
    'valid.contentTooLong': "The content can't be longer than {max} characters",

    // ── errors ───────────────────────────────────────────────────────────────
    'error.NETWORK_ERROR': "Couldn't reach the server. Check that the backend is running.",
    'error.TOO_MANY_REQUESTS': 'Too many requests in a row. Wait a moment and try again.',
    'error.INVALID_CSRF_TOKEN': 'Your security session expired. Reload the page.',
    'error.VALIDATION_FAILED': "The data sent isn't valid.",
    'error.INVALID_ID_FORMAT': "That note's identifier isn't valid.",
    'error.PAYLOAD_TOO_LARGE': 'This note is too large to save.',
    'error.UNSUPPORTED_MEDIA_TYPE': "The request format isn't what was expected.",
    'error.NOT_FOUND': "That isn't here anymore.",
    'error.NO_HISTORY': 'Nothing left to undo.',
    'error.NO_REDO': 'Nothing to redo.',
    'error.CONFIGURATION_ERROR': "The server is misconfigured. That one isn't on you.",
    'error.INTERNAL_SERVER_ERROR': 'The server failed to process the request.',
    'error.UNKNOWN': 'Something went wrong.',
    'error.withStatus': 'Error {status}',
    'error.dismiss': 'Dismiss the error',
};
