import type { Metadata } from 'next';
import { JetBrains_Mono, VT323 } from 'next/font/google';
import './globals.css';
import { THEME_BOOT_SCRIPT } from '@/config/theme';

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
            lang="es"
            className={`${jetbrainsMono.variable} ${vt323.variable}`}
            suppressHydrationWarning
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
            </head>
            <body>{children}</body>
        </html>
    );
}
