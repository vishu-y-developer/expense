# Money & Expense Tracker — Design System Reference

This file documents the design-system conventions of this codebase so that Figma designs can be
translated into code consistently (via the Figma MCP or by hand). Read this before generating any
new component or page from a Figma frame.

## 1. Token Definitions

**Location:** `src/index.css` — a single stylesheet, no token build step, no JS/TS token files.

Tokens are plain CSS custom properties, declared in three layers:

- `:root` — theme-independent tokens (radii, easing curves, durations, and the semantic
  positive/negative colors, which are intentionally constant across themes).
- `:root, :root[data-theme='dark']` — dark theme values (the default/primary theme).
- `:root[data-theme='light']` — light theme overrides. Only variables that actually differ are
  redeclared here; anything not redeclared falls through to the dark/common block.

```css
/* src/index.css */
:root {
  --radius-hero: 32px;
  --radius-lg: 24px;
  --radius-md: 18px;
  --radius-sm: 13px;
  --radius-pill: 999px;

  --ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 140ms;
  --dur-base: 280ms;

  /* Semantic — constant across themes */
  --positive: #34d399;
  --positive-soft: rgba(52, 211, 153, 0.16);
  --negative: #ff5a4e;
  --negative-soft: rgba(255, 90, 78, 0.14);
}

:root,
:root[data-theme='dark'] {
  --bg-0: #08080a;
  --text: #f6f6f4;
  --text-secondary: rgba(246, 246, 244, 0.6);
  --text-tertiary: rgba(246, 246, 244, 0.36);

  --accent: #e6ff3a;       /* electric yellow — the ONLY interactive accent in dark mode */
  --accent-2: #fbffb0;
  --accent-ink: #0a0a08;   /* text color to use ON TOP of --accent */
  --accent-soft: rgba(230, 255, 58, 0.14);
  --accent-glow: rgba(230, 255, 58, 0.35);

  --glass-strong-bg: rgba(255, 255, 255, 0.055);
  --glass-strong-border: rgba(255, 255, 255, 0.14);
  --glass-strong-blur: 36px;
  --glass-soft-bg: rgba(255, 255, 255, 0.035);
  --glass-soft-border: rgba(255, 255, 255, 0.09);
  --glass-soft-blur: 24px;

  --surface-tint: rgba(255, 255, 255, 0.05);  /* flat input/chip fill */
  --track: rgba(255, 255, 255, 0.1);          /* progress-bar tracks */
}

:root[data-theme='light'] {
  --bg-0: #eeece2;
  --text: #16160f;
  --accent: #cdb800;       /* olive-gold — the light-theme accent */
  --accent-ink: #0a0a08;
  /* ...same variable names, warm-neutral values */
}
```

**No token transformation pipeline exists** (no Style Dictionary, no Tokens Studio export, no
`tailwind.config` token map). If Figma variables need to enter this codebase, the target is this
CSS custom-property block in `src/index.css` — one variable per Figma variable, named in
kebab-case matching the patterns above (`--accent`, `--glass-soft-bg`, `--radius-md`, etc.).

**Two-tier "glass" elevation system** — this is the core visual primitive of the app and the
single most important thing to preserve when importing new Figma frames:

| Tier | CSS var prefix | Used for |
|---|---|---|
| Strong | `--glass-strong-*` | Hero cards, bottom nav, sheets/modals — heavier blur + glow |
| Soft | `--glass-soft-*` | Regular content cards — lighter blur, more transparent |

Applied via the `.glass-hero` / `.card` (soft) utility classes — see §6.

## 2. Component Library

**Location:** `src/components/` (shared, reusable) and `src/pages/` (route-level screens that
compose shared components). There is no Storybook, no `.stories.tsx` files, and no component
documentation site — this file is the documentation.

Architecture: plain function components, no component-generation framework (no shadcn/ui, no
Radix). Props are typed inline or via a local `interface`/type alias in the same file. No prop-docs
comments convention beyond TSDoc on exported pure functions in `src/calc/`.

Key reusable components and their intended Figma-frame mapping:

| Component | File | Figma equivalent |
|---|---|---|
| `Icon` | `src/components/Icon.tsx` | Any icon instance |
| `GlassSurface`, `GlassButton`, `GlassIconButton`, `GlassMetric`, `GlassProgress` | `src/components/Glass.tsx` | Card/button/stat/ring primitives |
| `AnimatedNumber` | `src/components/AnimatedNumber.tsx` | Any large currency figure that changes over time |
| `TransactionRow` | `src/components/TransactionRow.tsx` | List-item row (icon + title/meta + trailing amount) |
| `MonthSwitcher` | `src/components/MonthSwitcher.tsx` | Prev/label/next control |
| `ConfirmDialog` | `src/components/ConfirmDialog.tsx` | Bottom-sheet confirmation |
| `BottomNav`, `Sidebar` | `src/components/Navigation.tsx` | Mobile tab bar / desktop rail |

Example — `GlassSurface` (`src/components/Glass.tsx`), the base wrapper most new cards should use:

```tsx
export function GlassSurface({
  elevation = 'card',       // 'hero' | 'card'
  className = '',
  style,
  children,
}: {
  elevation?: 'hero' | 'card';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const base = elevation === 'hero' ? 'glass-hero' : 'glass-card';
  return <div className={`${base} ${className}`.trim()} style={style}>{children}</div>;
}
```

Not every screen uses the `Glass*` wrapper components directly — several pages (`Dashboard.tsx`,
`Analytics.tsx`, `Settings.tsx`) apply the same CSS classes (`.card`, `.glass-card`, `.glass-hero`)
directly to a `<div>` instead of importing the component. **Both are equivalent** because the
component is a thin wrapper — when generating new code from Figma, prefer the `Glass*` components
for consistency, but matching the CSS class names is what actually matters for visual parity.

## 3. Frameworks & Libraries

- **UI framework:** React 19 (function components + hooks only, no class components).
- **Routing:** `react-router-dom` v7, using `HashRouter` (required for a static-file, offline-first
  PWA with no server-side routing).
- **Styling:** plain CSS, one global stylesheet (`src/index.css`), imported once in `src/main.tsx`.
  **No CSS-in-JS, no CSS Modules, no Tailwind, no Sass.** Class names are hand-written, global,
  BEM-adjacent-but-not-strict (e.g. `.txn-icon`, `.txn-icon.earning`).
- **Icons:** `@phosphor-icons/react` (see §5).
- **Build tool:** Vite 8 (`vite.config.ts`), with `@vitejs/plugin-react` and `vite-plugin-pwa`.
- **Language:** TypeScript, strict mode (`noUnusedLocals`, `noUnusedParameters`,
  `verbatimModuleSyntax` all on — see `tsconfig.app.json`).
- **State:** React Context (`src/context/AppContext.tsx`) + local `useState`/`useMemo`. No Redux,
  no Zustand, no external state library.
- **Persistence:** `idb` (IndexedDB wrapper) — `src/db/db.ts` + `src/db/repository.ts`. Not
  relevant to visual design, but relevant if a Figma-driven component needs live data.
- **Testing:** Vitest + Testing Library, configured in `vite.config.ts`'s `test` block.

## 4. Asset Management

- **No `src/assets/` directory** — it was deliberately removed; the app ships no bitmap images.
- **PWA icons only:** `public/icons/icon-192.png`, `public/icons/icon-512.png` — flat PNGs
  referenced from `vite.config.ts`'s `VitePWA` manifest config and from `index.html`
  (`<link rel="icon">`, `<link rel="apple-touch-icon">`).
- **No CDN.** Everything is bundled and served locally, by design (this is an offline-first PWA —
  see `vite-plugin-pwa`'s `workbox.globPatterns` in `vite.config.ts`, which precaches all built
  assets for offline use). **Do not introduce CDN-hosted fonts, icons, or images** when importing
  Figma designs — self-host or inline everything, or the offline guarantee breaks.
- **No image optimization pipeline** (no `vite-imagetools`, no `sharp`) since there are no photo
  assets in the app. If a Figma frame includes photography, it should be added deliberately with a
  README note, not silently pulled in.

## 5. Icon System

- **Library:** `@phosphor-icons/react`, weight `light` by default (thin, elegant strokes, matching
  the "premium/restrained" visual direction).
- **Import style:** per-icon subpath imports for tree-shaking, e.g.
  `import { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife'` — **not** the barrel
  import (`from '@phosphor-icons/react'`), which pulls ~1500 icon modules into the dev/transform
  graph.
- **Single access point:** all icon usage goes through `src/components/Icon.tsx`'s `<Icon name="…" />`
  component — screens never import a Phosphor icon directly. This keeps icon choices centralized
  and swappable.

```tsx
// src/components/Icon.tsx
import { ForkKnife } from '@phosphor-icons/react/dist/csr/ForkKnife';
// ...one named import per icon used...

export type IconName = 'food' | 'travel' | 'shopping' | /* … */ 'refresh';

const COMPONENTS: Record<IconName, PhosphorIcon> = {
  food: ForkKnife,
  travel: Airplane,
  // …
};

export function Icon({ name, size = 20, weight = 'light', className, style }: {
  name: IconName; size?: number; weight?: PhosphorIconProps['weight'];
  className?: string; style?: CSSProperties;
}) {
  const Component = COMPONENTS[name];
  return <Component size={size} weight={weight} color="currentColor" className={className} style={style} aria-hidden="true" />;
}
```

- **Naming convention:** `IconName` uses camelCase domain names (`'debitCard'`, `'pocketMoney'`,
  `'chevronLeft'`), not the Phosphor component names directly — this is an intentional indirection
  layer. Two helper functions resolve a transaction's category/payment method to an `IconName`:
  `categoryIcon(type, category)` and `paymentIcon(method)` (bottom of `Icon.tsx`).
- **No emoji anywhere in the UI.** An earlier iteration used emoji as icons; it was fully replaced.
  When translating a Figma icon, always map it to a Phosphor equivalent via `Icon.tsx`, never paste
  an emoji character or an inline hand-drawn SVG path.
- **Color:** icons always use `color="currentColor"` — never hardcode an icon fill/stroke color;
  set `color` on the parent element or pass an inline `style={{ color: 'var(--positive)' }}` etc.

## 6. Styling Approach

- **Methodology:** global CSS, hand-written utility-ish classes (not a formal methodology like BEM
  or SMACSS, but consistently structured: block class + modifier class, e.g. `.chip.active`,
  `.txn-amount.earning`, `.flow-tile.spent`).
- **Global stylesheet:** `src/index.css`, ~1000 lines, organized into commented sections (Layout,
  Glass surfaces, Hero, Pills/badges, Stats, Progress, Recovery, Transaction rows, Navigation,
  Forms, Sheets/modals). New sections should follow this same commented-divider pattern.
- **Theming:** attribute-based, not class-based — `<html data-theme="dark">` /
  `data-theme="light"`, toggled by `src/context/AppContext.tsx` based on user settings (persisted
  in IndexedDB) or `prefers-color-scheme` when set to "system". **Every color/surface value must
  be a CSS variable** — never hardcode a hex color in a component's inline `style`, with the
  narrow exception of semantic overrides like `style={{ color: 'var(--positive)' }}` (still a
  variable, just applied inline for one-off cases).
- **Responsive strategy:** mobile-first. Base styles target the ~320–430px phone range; a single
  `@media (min-width: 900px)` breakpoint switches to the desktop layout (sidebar instead of bottom
  nav, wider `.page` max-width, a `.dash-pair` two-column grid for paired cards). There is no
  intermediate tablet breakpoint — test at 320px, 390px, and 1280px.
- **Animation:** CSS `@keyframes` + `transition`, gated globally by
  `@media (prefers-reduced-motion: reduce)` at the top of `index.css`, which zeroes out all
  animation/transition durations. Any new animated component gets this for free — no per-component
  reduced-motion handling needed.
- **Known pitfall (learned the hard way):** avoid `position: fixed` full-viewport elements with a
  heavy `filter: blur()` sitting behind `backdrop-filter` glass panels — this broke compositing in
  this codebase's target environment (content rendered in the DOM but failed to paint). The
  ambient background is implemented as a plain multi-layer CSS `background-image` on `<body>`
  (stacked `radial-gradient()`s), **not** as DOM elements. Keep it that way.

## 7. Project Structure

```
src/
  App.tsx                 # Router + shell (sidebar/bottom-nav layout switch)
  main.tsx                # Entry point, PWA service-worker registration
  index.css                # THE single global stylesheet / token source
  types.ts                 # Domain types (Transaction, categories, payment methods…)
  calc/                    # Pure calculation engine (no React) + its test suite
  db/                      # IndexedDB schema (db.ts) + CRUD/backup functions (repository.ts)
  context/AppContext.tsx   # Global app state (transactions, budgets, settings, theme)
  hooks/useMonthData.ts    # Derived-data hook combining context + calc engine for one month
  components/              # Shared, screen-agnostic UI components (see §2)
  pages/                   # One file per route, composes components + hooks
  utils/                   # date.ts, format.ts, id.ts — small formatting/helper functions
public/
  icons/                   # PWA manifest icons only
  favicon.svg, icons.svg   # left over from the Vite template, unused by the app itself
```

**Feature organization pattern:** not feature-folders — this is a small app organized by *layer*
(pages / components / hooks / context / db / calc / utils), not by feature/domain folder. A new
screen gets one file in `pages/`, wired into `App.tsx`'s `<Routes>`, and pulls shared pieces from
`components/`, `hooks/`, and `calc/` as needed. When generating a new page from a Figma frame,
follow this same layering rather than creating a self-contained feature folder.

## Quick checklist when importing a Figma frame

1. Map every fill/stroke color to an existing `--*` variable in `src/index.css`; add a new
   variable (in both the dark and light blocks) only if the design genuinely introduces a new
   semantic color — don't hardcode hex values in components.
2. Map every icon to a Phosphor icon via `Icon.tsx`'s `IconName` union — add a new case if needed,
   never inline an SVG or emoji.
3. Reuse `.glass-hero` / `.card` (soft glass) for any card-like surface; pick strong vs. soft based
   on whether it's a hero/nav/sheet-level element or a regular content card.
4. Build mobile-first at ~390px, then check the `@media (min-width: 900px)` desktop behavior —
   don't just stretch the mobile layout.
5. Any new animation must be motivated (state change, feedback, hierarchy) and must be silent
   under `prefers-reduced-motion` — this is automatic if you use the existing `--dur-*`/`--ease-*`
   variables and `transition`/`animation` properties, since the global reduced-motion override
   already catches those.
