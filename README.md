# FlashNotes · Frontend

Interfaz de FlashNotes. Next.js 16 (App Router) + Tailwind v4 + TypeScript.
Estética de sistema operativo de terminal: cemento y tinta, monoespaciada,
sin curvas.

## Arrancar

```bash
npm install
cp .env.example .env.local
npm run dev              # http://localhost:3000
```

Necesita el backend corriendo en `http://localhost:5000`.

## Verificar

```bash
npm run lint             # ESLint sobre src y tests
npm run typecheck        # TypeScript sin emitir
npm test                 # 58 tests
npm run build            # build de producción
```

## Estructura

```
src/
├── app/              Rutas del App Router y estilos globales
├── components/
│   ├── layout/       Cabecera, barra lateral, barra de estado
│   ├── notes/        Lista, ficha, editor, papelera
│   ├── ui/           Piezas reutilizables (MetaTag, ProgressBar, ConfirmDialog)
│   └── effects/      Efectos de la estética terminal
├── hooks/            Estado y comunicación con la API
├── lib/
│   ├── api/          Cliente HTTP (client.ts) y capa de API (notes.api.ts)
│   └── utils/        Formateadores y validadores
├── config/           Entorno y límites (espejo de los del backend)
├── styles/           Componentes y animaciones de la estética terminal
└── types/            Tipos compartidos
```

**Dónde va cada cosa:** los componentes pintan y reciben props; no llaman a la
API. Los hooks tienen el estado y hablan con `lib/api`. Si un componente importa
`notes.api`, algo se torció.

## Documentación

- [docs/DISENO.md](docs/DISENO.md) — sistema de diseño: tokens, tipografía,
  vocabulario visual y las reglas que no se saltan
- [docs/EFECTOS.md](docs/EFECTOS.md) — catálogo de los efectos escondidos: qué
  se ve, cómo se dispara cada uno, con qué números y por qué está hecho así
- [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) — puesta en producción
- `docs/specs/` — el diseño detrás de lo construido. Ahora mismo:
  [secretos del sistema](docs/specs/2026-09-01-secretos-del-sistema.md)
  (revisión 2), con el lore, las decisiones cerradas y el razonamiento de cada
  pieza. Nada de esto toca el backend.

## Dos trampas que ya costaron caro

**1. Los estilos propios se importan dentro de capas de cascada.**

```css
@import "../styles/terminal.css" layer(components);
```

En Tailwind v4 las utilidades viven en `@layer utilities`, y el CSS sin capa gana
siempre al CSS con capa, sin importar la especificidad. Con el reset fuera de
capas, `* { padding: 0 }` anulaba todas las utilidades de espaciado: `p-4`
calculaba `0px` en toda la aplicación.

**2. Ninguna clase inventada.** Si escribís `bg-secondary` o `text-meta`, tiene
que existir el token en el bloque `@theme` de `globals.css`. Había unas 30 clases
sin definir repartidas por el JSX que no pintaban nada.

## Variables de entorno

| Variable                     | Por defecto                     |
| ---------------------------- | ------------------------------- |
| `NEXT_PUBLIC_API_URL`        | `http://localhost:5000/api`     |
