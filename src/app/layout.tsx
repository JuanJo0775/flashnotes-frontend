import type { Metadata } from "next";
import { JetBrains_Mono, VT323 } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-mono",
    subsets: ["latin"],
    weight: ["400", "500", "700"],
});

const vt323 = VT323({
    variable: "--font-pixel",
    subsets: ["latin"],
    weight: ["400"],
});

export const metadata: Metadata = {
    title: "NOTES_OS v1.0",
    description: "Tu cuaderno del momento, en este navegador",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
        <body className={`${jetbrainsMono.variable} ${vt323.variable}`}>
        {children}
        </body>
        </html>
    );
}