# Project: Paranoia SMP — Refactoring Global & Responsive

## Architecture
- Framework: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Output: Standalone Node.js server (Docker / VPS deployment)
- Data Layer: Prisma ORM with PostgreSQL (`@prisma/adapter-pg`)
- Config Layer: `src/config/` as single-source-of-truth for static configurations, game lists, drop rates, and site constants
- Component Architecture: Atomic UI components (`src/components/ui/`, `src/components/common/`), Layouts (`src/components/layout/`), Feature modules (`src/features/`)

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Configuration & Data Extraction | Centralize Discord URL, Server IP, CDN urls in `src/config/site.ts` | M1 | Survey (R1) |
| 2 | Games & Chips Config | Unify game definitions & bet chips in `src/config/games.ts` | M1 | Survey (R1) |
| 3 | TCG Boosters Harmonization | Unify drop rates & pack definitions in `src/config/boosters.ts` | M1 | Survey (R1) |
| 4 | Shop Packages Config | Move coin packages to `src/config/shop.ts` | M1 | Survey (R1) |
| 5 | Reusable CopyIpButton | 1-click clipboard copy component with visual feedback | M1 | Survey (R1, R3) |
| 6 | Modular UserMenu Component | Extract `UserMenu` from `Navbar.tsx` into `src/components/common/` | M1 | Survey (R1) |
| 7 | Layout Double-Footer Fix | Remove redundant `<Footer />` in `app/layout.tsx` | M1 | Survey (R1) |
| 8 | Mobile Header & Drawer Nav | Mobile navbar with logo, UserMenu, theme toggle, drawer | M2 | Survey (R1, R3) |
| 9 | FloatingDock Link & Collision Fix | Replace `<a>` with `<Link>`, fix `ScrollToTop` collision & safe margins | M2 | Survey (R1, R3) |
| 10 | Tablet Layout & Grid Fix | Prevent navbar overflow at 768-880px, fix 4/2 grid compression | M2 | Survey (R1, R3) |
| 11 | Hero & Launcher Responsiveness | Eliminate Flip Words layout shift, make launcher tabs scrollable | M2 | Survey (R1, R3) |
| 12 | Legal Pages Creation | Add minimal `cgu/page.tsx` and `privacy/page.tsx` to fix 404 links | M2 | Survey (R1) |
| 13 | Purge Obvious/Descriptive Comments | Remove 25 redundant JSX comments across 9 files | M3 | Survey (R2) |
| 14 | Critical Files Top Docstrings | Add concise 1-3 line top-of-file docstrings to 26 critical modules | M3 | Survey (R2) |
| 15 | VPS Image Optimization (sharp) | Add `sharp` dependency and configure `images.remotePatterns` | M3 | Survey (R3) |
| 16 | VPS Docker Compose Config | Set internal `DATABASE_URL` in `docker-compose.yml` | M3 | Survey (R3) |
| 17 | Final Build & TS Certification | Verify `npx tsc --noEmit` and `npm run build` with 0 errors | M3 | Survey (R3) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Configuration & Data Extraction | `src/config/`, `CopyIpButton.tsx`, `UserMenu.tsx`, double-footer fix, booster harmonization | none | DONE |
| 2 | 100% Responsive UI Overhaul | Mobile nav header, `FloatingDock` SPA fix, tablet layout, Hero & Launcher fixes, legal pages | M1 | IN_PROGRESS |
| 3 | Targeted Docs & VPS Reliability | Purge 25 JSX comments, 26 top docstrings, `sharp`, `next.config.ts`, build validation | M1, M2 | PLANNED |

## Interface Contracts
### `src/config/site.ts` ↔ UI Components
- `siteConfig.serverIp`: string (`"play.paranoiasmp.fr"`)
- `siteConfig.discordUrl`: string (`"https://discord.gg/paranoiasmp"`)
- `siteConfig.skinCdn`: string (`"https://vzge.me"`)

### `src/config/boosters.ts` ↔ `RatesModal.tsx` & `PackOpenerClient.tsx`
- `BOOSTER_PACKS`: Record<string, BoosterPackConfig>
- Uniform drop rates across modal and opening engine

### `src/components/common/CopyIpButton.tsx`
- Props: `{ className?: string, variant?: "hero" | "badge" | "compact" }`
- Copies `siteConfig.serverIp`, switches icon from Copy to Check for 2s, triggers visual confirmation.

## Code Layout
- `src/config/`: Single-source-of-truth static data configurations
- `src/components/common/`: Reusable standalone UI widgets (`CopyIpButton.tsx`, `UserMenu.tsx`)
- `src/components/layout/`: Global navigation, footer, scroll-to-top
- `src/features/home/components/`: Home sections (`HeroSection.tsx`, `ServerOverviewSection.tsx`, `LauncherSection.tsx`)
- `src/app/cgu/page.tsx`, `src/app/privacy/page.tsx`: Legal route handlers
