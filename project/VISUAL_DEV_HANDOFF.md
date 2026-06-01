# WORDWERX — Visual Dev Phase Handoff
## For the next agent building out `app/visdev.jsx`

---

## What this project is

**WORDWERX** is a Vertoon (vertical-scroll animated comic) authoring workbench prototype.
It is a single HTML file (`WORDWERX.html`) built with inline React + Babel — no build step,
no bundler, no module imports. Every JS file is loaded via `<script type="text/babel" src="...">` tags.
All shared data lives on `window.*`.

The active series is **"Echo's Location"** — a solarpunk sci-fi mystery about a city AI
(Echo, voice-only, no avatar) and the journalist (Neelai) who stumbles into its machinery.

---

## Tech stack rules (critical)

| Rule | Detail |
|---|---|
| No module imports | `<script type="text/babel">` only. Use `window.X` to share across files. |
| Share exports | End every component file with `Object.assign(window, { MyComponent });` |
| Style conflicts | Every `styles` object must be uniquely named (e.g. `const visdevStyles = {}`) |
| Shared helpers | `cx()` (classnames), `Scene` component, `FxChip` etc. are on `window.*` already |
| CSS | All styles go in `app/styles2.css` (base tokens are in `app/styles.css` — don't touch) |
| Assets | Brand files in `app/brand/`. Scene art rendered by `app/scenes.jsx` |

---

## File map

```
WORDWERX.html           ← entry point; loads all scripts in order
app/
  styles.css            ← base CSS variables/tokens (DO NOT EDIT)
  styles2.css           ← all feature styles (ADD your visdev styles here)
  data.jsx              ← PANELS[], CHARACTERS[], LIBRARY[], effect vocabulary
  world.jsx             ← SERIES[], SEASONS[], ARCS[], BIBLE{}, VISDEV[], COPILOT_X{}
  scenes.jsx            ← <Scene kind="..."> component (all parallax artwork)
  effects.jsx           ← effect system (EFFECT_TYPES, FxChip, etc.)
  ui.jsx                ← shared atoms: cx(), Toast, etc.
  app.jsx               ← App root, nav, routing, copilot toggle
  series.jsx            ← Series workspace (gallery, configure drawer)
  narrative.jsx         ← Narrative workspace (Characters, Seasons, Storyboard, Script)
  compose.jsx           ← Production › Compose workspace
  preview.jsx           ← Production › Preview workspace
  stages.jsx            ← Production › Story/Library/Publish stubs
  copilot.jsx           ← Sherlock co-pilot panel
  visdev.jsx            ← ← ← BUILD HERE (Phase 3 scaffold currently)
  tweaks-panel.jsx      ← useTweaks() + TweakSlider/Toggle/etc.
  brand/
    wordwerx-logo.svg           ← primary logo (light bg)
    wordwerx-logo-dark.svg      ← dark-bg variant (top bubble lightened)
    wordwerx-icon.svg           ← icon only
    wordwerx-compact.svg        ← vertical compact
    brand-sheet.html            ← full brand reference
```

---

## CSS design tokens (key vars from styles.css)

```css
--bg           #1F2937   /* app background / nav */
--bg2          #27323f   /* drawer, card bg */
--bg3          #2f3d4d   /* input, sunken bg */
--raise        #3a4a5c   /* hover state bg */
--line         rgba(255,255,255,.07)
--line2        rgba(255,255,255,.13)
--ink          #e8edf3   /* primary text */
--ink2         #8fa0b4   /* secondary text */
--ink3         #546474   /* muted / labels */
--accent       #2563EB   /* brand blue */
--accent2      #16d6b4   /* teal — locked/active states */
--font-ui      system-ui, sans-serif
--font-disp    'Cabinet Grotesk', var(--font-ui)   /* headings */
--font-mono    'JetBrains Mono', monospace
```

Useful utility classes (styles2.css):
- `.ww-insp-sub` — section label (mono, uppercase, small, muted)
- `.ww-pv-kicker` — kicker line above a heading
- `.ww-sheet` — main content column (max-width 820px)
- `.ww-sheet-empty` — centered empty-state block
- `.ww-subtabs` / `.ww-subtab.is-on` — sub-navigation tabs
- `.ww-vargrid` — 2-col responsive card grid
- `.ww-varcard` / `.ww-varcard.is-locked` — variant exploration card
- `.ww-varcard-art` — card artwork area (Scene + badge overlays)
- `.ww-varcard-body` — card text/meta area
- `.ww-varcard-lock` — lock badge overlay
- `.ww-varcard-state` — state label (Locked reference / N explorations)
- `.ww-varcard-note` — muted note / brief line
- `.ww-varcard-dupe` — small ghost action button
- `.ww-raise` — interactive raise panel
- `.ww-cfg-block` — config section block
- `.ww-beats-stats` — stats row (used in storyboard sidebar)

---

## Routing — how Visual Dev gets rendered

In `app/app.jsx`:
```jsx
const [subs, setSubs] = ...  // { narrative: 'characters', visual: 'board', production: 'compose' }
// Visual Dev renders when ws === 'visual':
{ws === 'visual' && isEcho && <VisualDev tab={subs.visual} setTab={(v) => setSub('visual', v)} />}
```

The nav has two sub-items under Visual Dev:
- `board` → "Prototype board"
- `sheets` → "Model sheets"

`VIS_TABS` in visdev.jsx already maps these.

---

## Key data: `window.VISDEV`

The full subject list (characters + locations + props), each with:

```js
{
  id: 'neelai',
  subject: 'Neelai',          // display name
  kind: 'Character',          // 'Character', 'Character · voice', 'Location', 'Prop'
  scene: 'street_phone',      // Scene kind for artwork rendering
  hue: 30,                    // accent hue for this subject
  brief: '...',               // one-line visual brief
  locked: 'v3',               // null = unlocked; 'v3' = that variant is canonical
  variants: [
    { v: 'v1', scene, hue, state, note },  // state: 'Explored'|'Locked'|'Candidate'|'Rejected'
    ...
  ],
  sheet: {
    poses: ['Front', '3/4', 'Profile', 'Reaching'],
    expressions: ['Neutral', 'Curious', 'Alarmed', 'Resolved'],
    palette: ['#2a2236', '#e7a87a', '#3a2a30', '#cfe3ff'],
  },
  history: [
    { v: 'v3', when: 'Locked 2h ago', who: 'You' },
    ...
  ],
}
```

**Current subjects:** Neelai (locked v3), Wulan (locked v2), Echo (locked v2 — voice-only, no avatar),
Lantern Hub (unlocked — 2 candidates), Resin Logbook (locked v1).

---

## Key data: `window.CHARACTERS` (from data.jsx)

Each character has been extended with an `appearance` field in `data.jsx` — the visual brief
written by the narrative team, tagged "feeds Visual Dev". This is the text brief that seeds
the prototype board.

```js
{
  id: 'neelai', name: 'Neelai', role: 'Journalist', hue: 30,
  appearance: 'Early 20s, Mara. Slight build, expressive face, cropped dark hair...',
  // + wants, flaw, voice, notes, portrayal fields
}
```

The `BIBLE` object in `world.jsx` also holds extended character detail (wants, flaw, voice, arc, rels).
Match `BIBLE[char.id]` to `CHARACTERS.find(c => c.id === char.id)`.

---

## What to build in `visdev.jsx`

### Tab 1 — Prototype Board (`tab === 'board'`)

A two-panel layout:
- **Left/main:** subject grid — one card per VISDEV entry. Cards show:
  - Scene art thumbnail
  - Subject name + kind badge
  - Lock state: locked variant (teal "● v3 locked") OR "N candidates / explorations"
  - Brief line
  - On locked subjects: a subtle locked overlay treatment (`.is-locked`)
  - On unlocked subjects: a "＋ Explore" / action button

- **Right/side (or inline on click):** Variant inspector — when a subject is selected:
  - Shows all variants as a filmstrip / small card row
  - Each variant: scene thumbnail, state badge (Locked/Candidate/Explored/Rejected), note
  - Lock action: "Lock as canonical →" button (sets that variant as locked)
  - Promote/reject per variant
  - History log (`.history` array)
  - The character's `appearance` brief from CHARACTERS/BIBLE (labelled "Narrative brief")

- **Subject selector:** clicking a card opens the inspector. A "← Back" or persistent side panel.

### Tab 2 — Model Sheets (`tab === 'sheets'`)

For each VISDEV subject that has a locked variant + a `sheet` object:
- A **model sheet card** showing:
  - The subject name + locked variant tag
  - **Poses row:** a row of Scene thumbnails, each labelled with the pose name
  - **Expressions row:** (characters only) expression thumbnails
  - **Colour palette:** a row of colour chips from `sheet.palette`
  - An "Export reference" ghost button (no-op for now)
- Unlocked subjects show a placeholder ("Lock a variant to generate a model sheet")

### Lock workflow (cross-workspace)

When a variant is locked on the board:
- The subject card flips to `.is-locked` treatment
- A notification toast flashes (use `window.flash()` if exposed, or internal state)
- The `history` array gets a new entry prepended
- The Sherlock co-pilot in Visual Dev context (`COPILOT_X.visual`) has two canned prompts:
  - "Anything off-model?" and "Lock the Lantern Hub"

### Copilot context

The Sherlock panel auto-receives `stage='visual'` when Visual Dev is active.
`window.COPILOT_X.visual` has two seed Q&A pairs — wire them to the Sherlock quick-action buttons.
Look at how `copilot.jsx` uses `COPILOT_X[stage]` for the "Check Echo's portrayal" buttons.

---

## UI vocabulary to follow

Look at the Narrative workspace (narrative.jsx) for the exact patterns to match:

- Section headers: `<div className="ww-insp-sub">Label · {count}</div>`
- Kicker above title: `<div className="ww-pv-kicker">Visual Dev · Echo's Location</div>`
- Empty states: `<div className="ww-sheet-empty">` with a kicker + bold title + `<p>`
- Cards: `.ww-varcard` inside `.ww-vargrid` (already in styles2.css, already used in the scaffold)
- State badges: small `.ww-varcard-state` / `.ww-varcard-lock` spans on card art
- Sub-tabs: `.ww-subtabs` / `.ww-subtab.is-on` (already rendered in the scaffold)
- Artwork: always use `<Scene kind={s.scene} />` — never img tags for panel art
- Tone: charcoal dark UI, teal (#16d6b4) for locked/confirmed states, blue (#2563EB) for actions

---

## Scene kinds available (from scenes.jsx)

All currently registered scene kinds (use these for thumbnails):
`dusk_skyline`, `street_phone`, `rescue`, `night_lockdown`, `lantern_hub`,
`lanternwrights`, `echo_call`, `tunnels`, `logbook`, `summit`, `reef`,
`parallax_demo`

---

## What's already done (don't re-build)

| Workspace | Status |
|---|---|
| Series (gallery, configure, create) | ✅ Complete |
| Narrative › Characters | ✅ Complete (with Appearance field → feeds Visual Dev) |
| Narrative › Seasons (editable arc board) | ✅ Complete |
| Narrative › Storyboard (insert/move/delete) | ✅ Complete |
| Narrative › Script (speaker picker, delivery) | ✅ Complete |
| Production › Compose, Preview, Story, Library, Publish | ✅ Complete |
| Sherlock co-pilot (all workspace contexts) | ✅ Complete |
| Three-icon nav header (logo · pipe · bell) | ✅ Complete |
| Visual Dev scaffold (tabs + subject grid stub) | ✅ Complete |

---

## Handoff checklist for Visual Dev

- [x] Build Prototype Board: subject grid + variant inspector side panel
- [x] Wire lock action: updates subject.locked, prepends history, shows teal locked state
- [x] Wire Narrative brief: pull `appearance` from CHARACTERS + BIBLE into inspector
- [x] Build Model Sheets tab: poses/expressions/palette per locked subject
- [x] Sherlock integration: surface `COPILOT_X.visual` Q&A in copilot quick-actions
- [x] Add "Explore" flow stub: clicking "＋ Explore" adds a new candidate variant
- [x] Add "Develop in Visual Dev →" deep-link FROM Characters tab — sets `ws='visual'` and pre-selects that character's subject card via `visualSelId` state + `preselect` prop

## Phase 3 completed — 2026-05-31

All checklist items shipped and verified. The only remaining optional work across the
whole project is **Narrative polish (Phase 2)**: wiring "Insert beat" and "Add panel"
in Storyboard/Script to actually mutate `PANELS` state.

---

## Starting the session

1. Read this file first.
2. Read `app/visdev.jsx` (the scaffold — 54 lines).
3. Read `app/world.jsx` lines 100–174 (VISDEV data + COPILOT_X).
4. Read `app/narrative.jsx` lines 1–50 (BeatSheet / CharacterPanel patterns to follow).
5. Read `app/styles2.css` grep for `.ww-varcard` to see existing card styles.
6. Build in `app/visdev.jsx`. Add new CSS to `app/styles2.css`.
7. End with `Object.assign(window, { VisualDev });`.

Good luck — the data, styles, and routing are all ready. It's a build session, not a design one.
