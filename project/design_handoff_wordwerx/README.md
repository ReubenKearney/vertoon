# Handoff: WORDWERX — Vertoon Workbench

## Overview

WORDWERX is a vertoon (vertical scroll comic) authoring workbench. Writers and directors use it to develop stories across four interconnected workspaces: **Series**, **Narrative**, **Visual Dev**, and **Production**. All three phases of the prototype are complete and verified.

## About the Design Files

The files in this bundle are **high-fidelity design references built in HTML + React/Babel**. They are prototypes showing intended look, layout, and interactive behavior — not production code to ship directly.

Your task: **recreate these designs in a real React codebase** (Vite or Next.js recommended) using proper module imports, a real router, and appropriate state management (Zustand or React Query). The inline Babel/`window.*` global pattern in the prototype is a prototyping convenience — replace it with real ES module imports and typed interfaces.

## Fidelity

**High-fidelity.** Pixel-accurate layout, final colour palette, typography, spacing, and interaction states. Recreate the UI as precisely as possible using the codebase's design system, or the tokens defined below if starting fresh.

---

## Architecture Overview

```
WORDWERX.html          ← entry point
app/
  styles.css           ← base design tokens (DO NOT MODIFY — source of truth)
  styles2.css          ← workspace-specific CSS (Series, Narrative, Visual Dev)
  data.jsx             ← episode data model, PANELS, CHARACTERS, LIBRARY, mkFx()
  world.jsx            ← SERIES, SEASONS, ARCS, BIBLE, VISDEV data
  app.jsx              ← root shell: navigator, routing, state, TweaksPanel
  narrative.jsx        ← Narrative workspace (Characters, Seasons, Storyboard, Script)
  visdev.jsx           ← Visual Dev workspace (Prototype board, Model sheets)
  copilot.jsx          ← Sherlock AI co-pilot sidebar
  brand/               ← SVG logo assets
```

---

## Design Tokens

Defined as CSS custom properties on `:root` in `app/styles.css`. Use these as-is in any CSS-in-JS or Tailwind config.

### Colours

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#1F2937` | App background (charcoal) |
| `--bg2` | `#27323f` | Panel/sidebar background |
| `--bg3` | `#313d4b` | Raised surface, inputs, chips |
| `--raise` | `#3b4856` | Highest surface (toasts, dropdowns) |
| `--line` | `rgba(255,255,255,.08)` | Subtle divider/border |
| `--line2` | `rgba(255,255,255,.15)` | Stronger border (focus-adjacent) |
| `--ink` | `#ecedf2` | Primary text |
| `--ink2` | `#9aa0b4` | Secondary text / labels |
| `--ink3` | `#5f6478` | Tertiary / placeholder / mono labels |
| `--accent` | `#2563EB` (default) | Primary action colour (user-tweakable) |
| `--accent2` | `#16d6b4` | Teal — locked states, canonical badges |

### Typography

| Token | Value |
|---|---|
| `--font-ui` | `"Geist", "Space Grotesk", system-ui, sans-serif` |
| `--font-disp` | `"Space Grotesk", system-ui, sans-serif` |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` |

**Scale in use:**
- Page titles: `font-disp`, 34–46px, weight 600
- Section headings: `font-disp`, 22–26px, weight 600
- Body: `font-ui`, 12.5–14px, line-height 1.5–1.6
- Labels / mono tags: `font-mono`, 9–11px, uppercase, `letter-spacing: .12-.22em`
- Min text size: 9px (mono labels); nothing below that

### Spacing & Shape

| Token | Value | Usage |
|---|---|---|
| `--r` | `10px` | Standard border-radius |
| `--shadow` | `0 18px 50px rgba(0,0,0,.5)` | Card elevation |

---

## Screens / Views

### 1. Global Shell — Navigator + Topbar

**Layout:** Full-height flex row. Left nav rail (220px wide, fixed) + right main content area.

**Left nav (`ww-nav2`):**
- Brand logo at top (SVG wordmark). Click → Series view.
- Icon row: Sherlock (deerstalker hat SVG), notifications bell. Both are 36×36px icon buttons, `--bg2` background, `--line` border, `var(--r)` radius.
- Series switcher button below icons: 60px tall, shows cover art thumbnail (40×40px, rounded) + series title (13px bold `font-disp`) + status (10px `font-mono` `--ink3`). Clicking opens a popover menu listing all series with coloured dots.
- Nav section list: workspace buttons (`ww-nav2-ws`), each 36px tall, left-padded 14px. Glyph (16px) + label (12px). Active state: `--bg3` background + 2px left accent bar (`--accent` colour, glowing box-shadow).
- Collapsible children (`ww-nav2-children`): indented 20px, 11px `font-ui`, 30px tall. Active child: `--accent` colour text.

**Active indicator:** 3px wide pill on the left edge, `--accent` fill, `0 0 12px var(--accent)` glow.

**Interactions:**
- Clicking a parent workspace button navigates to it and remembers last sub-tab.
- Clicking the chevron `▸` on a workspace collapses/expands children without navigating.
- Series menu: absolute positioned popover, `--raise` background, `--shadow` elevation. Each item has cover art + title + colour dot. "Manage all series →" footer link.

---

### 2. Series Workspace

**Layout:** Padded scrollable content area. Three sections stacked vertically.

**Active series hero:** Full-width card with cover Scene art (aspect-ratio 2.4:1), gradient overlay, series title overlaid (`font-disp` 38px), kicker label (`font-mono` 10px, `--accent` colour), tagline, stat chips.

**Series grid (`ww-series-grid`):** CSS grid, `auto-fill minmax(260px, 1fr)`, gap 16px. Each card:
- Cover thumbnail (aspect 1.8:1)
- Meta: title (13px bold), genre (10px `--ink3`), status badge, progress bar
- Hover: `translateY(-3px)`, stronger box-shadow
- Active (selected): `inset 0 0 0 1.6px var(--accent)` + accent glow

**Canon rules panel:** `--bg2` background, `--r` radius, `inset 0 0 0 1px var(--line)`. Bullet list with `--accent2` dots.

**＋ New series card:** Dashed border `--line2`, `--bg2` fill, centred `＋` (26px), hover → accent border.

---

### 3. Narrative Workspace — 4 sub-tabs

Sub-tab bar (`ww-subtabs`): horizontal row of pill tabs at top of workspace. Each tab shows glyph (14px) + label + count badge (`font-mono` 8px). Active: `--accent` underline + `--ink` text. Inactive: `--ink3`.

#### 3a. Characters (Bible)

**Two-panel layout:** Left roster sidebar (220px) + right profile panel (flex: 1).

**Roster sidebar:**
- Header: "Roster · N" in `font-mono` 9.5px uppercase
- Each character card (`ww-rostercard`): flex row, 40px tall, 8px padding, `--r` radius. Avatar circle (32px) with radial-gradient fill keyed to character's `tint` hue + initial letter. Name (12px bold) + role (10px `--ink3`). State dot (6px circle, colour by state).
- Selected card: `inset 0 0 0 1px var(--accent)` + `--bg3` background.

**Profile panel:**
- Hero row: 64px avatar circle + name (h1, `font-disp` 32px) + role + desc.
- **Appearance textarea** (`ww-bp-appear`): Labelled section "Appearance" with "◎ feeds Visual Dev" tag in `--accent2`. Textarea: `--bg` background, `--line2` border, 13px, 3 rows. Below: a link button "Develop X's look in Visual Dev →" that deep-links to Visual Dev prototype board pre-selecting that character.
- **4-cell grid**: Wants / Flaw / Voice / Secret. Each cell: `--insp-sub` label + paragraph body text.
- **Season arc track**: flex row with start label → animated line → end label (in `--accent`).
- **Relationships list**: clickable character cards that navigate to that character.

#### 3b. Seasons (Arc Board)

**Layout:** Scrollable grid. Header row + one row per throughline.

**Grid columns:** `200px` (throughline label) + `repeat(N, minmax(134px, 1fr))` (one per episode).

**Episode header cells**: "Ep 01" in `font-mono` 10px + episode title (12px bold). Click to edit title inline (`input`).

**Throughline rows (`ww-arcrow`):**
- Label column: throughline name (bold, editable) + description (10px `--ink2`, editable). Background keyed to `--h` (hue CSS var).
- Beat cells: click → textarea. Empty state shows `＋` centered in `--ink3`. Filled cells show beat text.
- Colour accent: `hsl(var(--h), 70%, 25%)` tint on filled cells.

**Toolbar:** "＋ Episode" + "＋ Throughline" buttons (`ww-arc-add`): `font-mono` 11px, `--bg3` background, `--line` border, 8px radius.

**Inline editing:** `Enter` commits, `Escape` cancels.

#### 3c. Storyboard (Beat Sheet)

**Two-panel layout:** Left beat list (flex:1) + right sidebar (280px fixed).

**Beat list:**
- Header: episode title (h2, 22px) + beat count + genre.
- Act sections (`ww-act`): "Act I · Setup" label in `font-mono` 9px + horizontal rule. Acts calculated by position (0–30% = I, 30–72% = II, rest = III).
- Beat cards (`ww-beatcard`): flex row, `--bg2` background, 11px radius. Contains:
  - Number (`font-disp` 24px `--ink3`)
  - Scene thumbnail (38×50px, `--r` 5px, Scene component)
  - Body: slug (12.5px bold) + caption or dialogue preview (10px `--ink2`)
  - Side: beat-type tag + duration tag + ops buttons (▴ move up, ▾ move down, ＋ insert after, ✕ delete)
- Selected card: `inset 0 0 0 1px var(--accent)` glow.
- "＋ Add panel at end" dashed footer button.

**Right sidebar:**
- Tension curve: SVG polyline (100×100 viewBox), filled gradient under curve, circle dots per beat. Selected beat dot in `--accent2`. Non-scaling strokes.
- Stats grid: Beats / Peak / Effects wired / Dialogue beats / Runtime.

**State:** All mutations use `rebuild(story)` which re-numbers panels and calls `setPanels`. Move up/down swaps adjacent array items.

#### 3d. Script Editor

**Layout:** Scrollable list of panel cards, padded 32px.

**Script header:** kicker + h2 (series + episode) + subtitle (panel count).

**Panel card (`ww-spanel`):**
- **Bar row** (`ww-spanel-bar`): flex, `--bg3` background, `--line` border, 10px radius.
  - Number span (`font-mono` 11px `--ink3`, 30px wide)
  - Slug input (`font-mono` 13px, transparent background, no border, flex:1)
  - Beat-type `<select>` (`ww-spanel-sel`): `--bg3` bg, `--line` border, 10px `font-mono`, 5px radius. Options: all 13 beat types.
  - Scene `<select>` (`ww-spanel-scene`): same styling, max-width 108px. Options: 12 scene keys, underscores → spaces.
  - Duration span (`font-mono` 10px `--ink3`)
  - Ops buttons (`ww-spanel-ops`): ＋ (insert after) and ✕ (delete). 11px, `--bg3` bg, `--line` border. Hover: ＋ → accent border, ✕ → `#ff7a6a` border + colour.
- **Body row** (`ww-spanel-body`): flex row.
  - Mini scene thumbnail (80×104px, Scene component) with FX chips overlaid at bottom.
  - Fields column: Narration textarea (2 rows, `--sfield-narr`), optional Dialogue section (speaker select + delivery select + dialogue textarea with delivery-specific styling), pacing pill, "＋ Add dialogue" / "✕ Remove dialogue" toggles.

**"＋ Add panel at end"** button: `ww-addbeat` class, dashed border, full-width, 46px tall.

**Mutations:** `insertAfter(id)`, `del(id)`, `append()` all call `rebuild()` which re-numbers and calls `setPanels`.

---

### 4. Visual Dev Workspace — 2 sub-tabs

#### 4a. Prototype Board

**Two-panel layout:** Left subject sidebar (240px fixed) + right inspector (flex:1, scrollable).

**Subject sidebar:**
- Header: "Subjects · N" (`font-mono` label)
- Subject buttons (`ww-proto-subj`): flex row, 72px tall, `--bg2` bg. Scene thumbnail (48×40px, 7px radius) + name (13px bold) + kind (10px `--ink3`) + lock dot (7px circle: teal `--accent2` if locked, transparent with outline if not).
- Selected: `inset 0 0 0 1px var(--accent)` + `--bg3` bg.

**Empty state** (no subject selected): centered message with kicker + h3 + paragraph.

**Variant Inspector (right panel):**
- **Header**: kicker ("Visual Dev · [kind]") + h2 (subject name) + brief paragraph. Right side: lock badge (`ww-vd-lockbadge`: `--accent2` colour, teal tinted bg, 7px square dot, `font-mono` 10.5px) or "No lock · N candidates" label + "＋ Explore" button.
- **Narrative brief panel** (`ww-bp-appear`): labelled "Narrative brief" + "◎ from Characters" tag. Body text from `BIBLE[id].appearance`.
- **Generate bar** (`ww-proto-genbar`): flex row, `--bg2` bg, `--line` border, 12px radius. Input (flex:1, placeholder text) + style lock label (`font-mono` 10px) + "Generate" primary button.
- **Variant grid** (`ww-vargrid`): CSS grid `repeat(auto-fill, minmax(200px, 1fr))`, gap 14px.

**Variant Card (`ww-varcard`):**
- Art area: Scene component, version badge (`v1` etc.) top-left in `font-mono` 9px, state pill bottom-left (teal "● locked" on locked cards, amber "candidate" on candidates).
- Body: state label (colour-coded) + note text (12px `--ink2`) + action row.
- Actions: "Lock canonical →" button (primary when not locked; replaced by "● Canonical" teal badge when locked) + ✕ reject / ↩ restore buttons.
- Locked card: `inset 0 0 0 2px var(--accent2)` + teal glow.
- "New exploration" dashed card: same grid cell, dashed border, `＋` centred.

**History timeline** (`ww-sheet-history`): flex column of rows. Each row: version label (bold) + when (italic `--ink3`) + who (`font-mono` 10px). First row (most recent lock): teal left border.

#### 4b. Model Sheets

**Layout:** Scrollable list of subject cards, one per locked subject.

**Per-card sections:**
1. **Header**: subject name + locked version badge + brief + "Export reference ↗" ghost button.
2. **Hero art** (`ww-sheet-hero`): 100% wide, aspect 800/480, Scene component, gradient overlay at bottom, bottom-left tag: "Kind · Canonical · vN · locked when".
3. **Two-column grid** (`ww-sheet-cols`): Poses + Expressions (or Notes for non-characters).
   - Each section has `font-mono` label + grid of small cells (`ww-sheet-cell`): Scene thumbnail + pose/expression label centred below.
4. **Palette** (`ww-sheet-pal`): flex row of swatches. Each swatch: coloured square (40×40px, 8px radius) + hex value below in `font-mono` 9px.
5. **Lock history**: same `ww-sheet-history` pattern.

**Awaiting lock section**: list of pending subjects. Each row: thumbnail + name + kind + "No lock" badge.

---

### 5. Production Workspace

Five sub-tabs sharing the same sub-tab bar. Fully working in the prototype — read the source for exact interaction details.

| Sub-tab | Key component | Notes |
|---|---|---|
| Story | Read-only beat summary, throughline list | Static view |
| Library | Asset grid + generate form | `setLibrary` state |
| Compose | Filmstrip / Board / Cinema canvas + Inspector | Most complex — 3 canvas modes, FX inspector with 3 UI variants |
| Preview | Phone bezel + scrollable reader + side panel | Scroll simulation, reveal animations, hotspots |
| Publish | Format picker + stats + poster art | Mock publish flow |

---

### 6. Sherlock Co-pilot Sidebar

**Layout:** 330px right panel. Appears when Sherlock icon is active and workspace ≠ Series.

**Header** (46px): "Sherlock" label + workspace context badge (`font-mono` 9px, `--bg3` bg) + close `✕` button.

**Message thread:** flex column, gap 12px, scrollable. Two message types:
- AI (`ww-msg.is-ai`): left-aligned, `--bg3` bubble, `--line` border, top-left radius 4px.
- User (`ww-msg.is-me`): right-aligned, accent-tinted bubble, top-right radius 4px.
- Typing indicator: 3 animated dots (`ww-typing`), `opacity` pulse.
- "Apply →" button: `--accent` bg, white text, 11.5px.

**Quick suggestions** (`ww-cop-sugg`): flex-wrap row of pill buttons. `--bg3` bg, `--line` border, 20px radius. Hover → accent border.

**Input row**: text input (flex:1, `--bg` fill) + send button (`--accent` bg, `▶` icon). Disabled when empty.

---

## Interactions & Behaviour

| Action | Behaviour |
|---|---|
| Nav workspace click | Sets active workspace; remembers last sub-tab per workspace |
| Series switcher | Popover menu; switching to a non-Echo series shows placeholder screen |
| "Develop X's look →" | Navigates to Visual Dev → Prototype Board, pre-selects that subject |
| Lock variant | Updates `subject.locked`, flips previous lock to Explored, prepends history entry, shows toast |
| Insert beat (Storyboard) | Splices new panel after selection, re-numbers entire sequence |
| Insert panel (Script) | Same — both use `rebuild()` |
| Arc board cell edit | `Enter` commits, `Escape` cancels; saves to local React state |
| Accent colour tweak | CSS `--accent` var swapped; `--accent2` auto-flips (teal ↔ purple) to maintain contrast |
| Density tweak | `--dens` var scales sidebar/inspector widths; body font size class toggled |
| Toast | 2.6s auto-dismiss, single `clearTimeout` pattern |
| Copilot "Apply →" | Dispatches action to root `onApply()` — patches panels, flashes toast, may navigate |

---

## State Model

All state lives in `<App>` and is passed down as props. Key pieces:

```ts
// Root state
ws: 'series' | 'narrative' | 'visual' | 'production'
subs: { narrative: NarrTab; visual: VisTab; production: ProdTab }
panels: Panel[]          // shared between Narrative and Production
library: Asset[]
selId: string            // selected panel ID in Compose
visualSelId: string|null // deep-link preselect for Visual Dev
copilot: boolean
toast: string|null
series: Series[]
activeSeries: string     // 'echo' | 'tide' | 'quartz' | 'lantern'

// Tweaks (persisted to localStorage)
canvasModel: 'filmstrip' | 'board' | 'cinema'
fxUI: 'inspector' | 'tracks' | 'stage'
accent: string           // hex
grain: boolean
density: 'compact' | 'regular' | 'comfy'
```

**Panel shape:**
```ts
interface Panel {
  id: string
  n: number              // 1-indexed display number
  slug: string           // scene heading
  scene: SceneKey        // maps to Scene art component
  beat: BeatType
  dur: string            // e.g. "4.0s"
  caption: string
  dialogue?: string
  speaker?: string
  delivery?: DeliveryType
  layers: Layer[]
  fx: Effect[]
}
```

**Effect shape:**
```ts
interface Effect {
  id: string
  type: EffectType       // reveal | parallax | transition | loop | sound | impact | tap | pacing
  on: boolean
  params: Record<string, string|number>  // keyed by param name, values match EFFECT_TYPES
}
```

---

## Data Seeding

In production, replace the static `PANELS`, `CHARACTERS`, `ARCS`, `VISDEV`, `SERIES` objects with API calls or a database. The data shapes are fully documented in `app/data.jsx` and `app/world.jsx`.

---

## Scene Component

`<Scene kind="dusk_skyline" />` is used everywhere as a placeholder for real AI-generated art. It renders a coloured gradient + abstract shape SVG. In production, replace with `<img>` or `<canvas>` driven by your asset pipeline. The `kind` prop maps to a scene key — all valid keys are defined in `SCRIPT_SCENES` in `narrative.jsx`.

**Valid scene keys:** `dusk_skyline`, `street_phone`, `lanternwrights`, `night_lockdown`, `lantern_hub`, `logbook`, `mosquito`, `tunnels`, `echo_call`, `locked_hatch`, `rescue`, `aftermath`, `parallax_demo`

---

## Assets

| Asset | Path | Notes |
|---|---|---|
| WORDWERX wordmark | `app/brand/wordwerx-logo-dark.svg` | Used in nav header |
| WORDWERX compact icon | `app/brand/wordwerx-compact.svg` | Favicon / small contexts |
| Scene art | All placeholder SVG gradients | Replace with real generated art |

---

## Files in this Bundle

| File | Purpose |
|---|---|
| `WORDWERX.html` | Entry point — load this in a browser to see the full prototype |
| `app/styles.css` | Design token source of truth |
| `app/styles2.css` | Workspace-specific CSS |
| `app/data.jsx` | Episode data, effect vocabulary, `mkFx()` |
| `app/world.jsx` | Series catalogue, seasons, arcs, character bible, visual dev data |
| `app/app.jsx` | Root shell, navigator, routing, tweaks |
| `app/narrative.jsx` | Narrative workspace — all 4 tabs |
| `app/visdev.jsx` | Visual Dev workspace — both tabs |
| `app/copilot.jsx` | Sherlock co-pilot sidebar |
| `app/brand/` | SVG brand assets |

---

## Recommended Implementation Stack

- **Framework:** React 18 + Vite (or Next.js App Router)
- **Styling:** CSS Modules or vanilla CSS using the existing token system; or port tokens to Tailwind config
- **State:** Zustand for global app state; React Query for any server data
- **Routing:** React Router v6 or Next.js routing — map workspace + sub-tab to URL segments (e.g. `/narrative/script`)
- **Types:** TypeScript — the data models above map directly to interfaces

---

## Coming Back to This Design Environment

When you need to explore a new screen or refine an existing one:
1. Connect this project's GitHub repo to the design environment
2. Paste the GitHub URL of the relevant component file
3. The designer will read your real source code, match the visual vocabulary, and prototype the change here
4. Approve, then take the diff back to Claude Code
