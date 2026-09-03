import type { Metadata } from 'next';
import { JetBrains_Mono, VT323 } from 'next/font/google';
import './globals.css';
import { THEME_BOOT_SCRIPT } from '@/config/theme';
import { LANG_BOOT_SCRIPT, DEFAULT_LANG } from '@/config/lang';
import { LOCKOUT_BOOT_SCRIPT } from '@/config/lockout';

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains',
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    display: 'swap',
});

const vt323 = VT323({
    variable: '--font-vt323',
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'FLASH-NOTES v1.0',
    description: 'Tu cuaderno del momento, en este navegador',
};

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        // Las variables de next/font se cuelgan de <html>, no de <body>:
        // --font-mono se define en :root y referencia --font-jetbrains, así que
        // tiene que estar disponible en el mismo elemento o por encima.
        <html
            // El idioma por defecto es sólo el del render del servidor: el
            // script de arranque lo corrige —siguiendo la elección guardada o el
            // navegador— antes del primer pintado. `<html lang>` no es
            // decorativo, es lo que hace que un lector de pantalla elija la voz.
            lang={DEFAULT_LANG}
            className={`${jetbrainsMono.variable} ${vt323.variable}`}
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
                <script dangerouslySetInnerHTML={{ __html: LANG_BOOT_SCRIPT }} />
                {/* Y el bloqueo: sin esto, recargar en pleno fallo crítico
                    enseñaba la pantalla de inicio un segundo antes de volver al
                    error, y recargar parecía funcionar. */}
                <script dangerouslySetInnerHTML={{ __html: LOCKOUT_BOOT_SCRIPT }} />
            </head>
            <body>{children}</body>
        </html>
    );
}
