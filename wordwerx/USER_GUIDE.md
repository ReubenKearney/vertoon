# WORDWERX — user guide

How to use the image-generation features and what works offline. Run everything
with `npm run dev:all` (Vite + the companion server) or the VS Code task
**"WORDWERX: Restart dev server + open Chrome"**.

## Online vs offline

- **Generating images needs internet** (a cloud GPU runs the model). When you're
  offline the **Generate** buttons show an "offline" badge and are disabled.
- **Everything else works offline.** Generated images are saved to a local store
  on the companion server (`server/store/`), so editing, preview, and publishing
  keep working with no internet — including opening an exported comic on a plane.

## Where images live
Each generated image is saved once to `server/store/assets/<id>.png` and the app
references it by a short `/api/assets/<id>` URL (never a giant base64 blob). Your
links — a character's LoRA, a character portrait, a locked canonical, panel art —
persist in `server/store/db.json` and re-load on refresh.

## The surfaces

### Production → Library
Type a prompt, pick a workflow (Flux / SDXL / dataset batch) and optionally a
LoRA, then **Generate**. Images land in the library grid and persist. Use
**dataset batch** to make many variations for training a LoRA.

### Narrative → Characters (the bible)
Each character has an **Appearance** description, a **LoRA** selector, and
**Generate portrait**. The portrait is generated from the appearance text (plus
the chosen LoRA) and shows on the hero + roster. The selected LoRA becomes that
character's LoRA everywhere they're generated.

### Visual Dev → Prototype board
Select a subject → **Generate variant** (seeded from the character's appearance
and LoRA). Reject weak ones; **Lock canonical** on the keeper — that records the
canonical image for model sheets and publishing.

### Visual Dev → Model sheets
For a locked subject, **Generate expressions** edits the canonical image into
each expression (smile, worried, …) via the Kontext workflow — keeping the
character consistent.

### Visual Dev → Locations
Load a location image, then **Generate angle** to regenerate it from a new,
consistent camera angle (the ControlNet workflow keeps the structure via the
image's lines). Generated angles collect in a gallery.

### Visual Dev → LoRAs
- **Upload** an existing `.safetensors`.
- **Train new**: pick a character, add ~10–25 images, set steps/rank, **Train
  LoRA**. When it finishes, the LoRA is uploaded to the volume, listed, and
  linked to that character automatically.

### Production → Compose (lay out the vertoon)
Select a panel from the rail, then in the inspector:
- **Layers** — assign generated art per layer, back → front. **Drag the ⋮⋮ grip**
  to reorder layers (depth ordering); the assigned art follows the layer. The
  layer depth (`z…`) drives parallax.
- **Text** — your dialogue and captions appear as **bubbles and caption boxes
  directly on the panel**. Drag them to position, drag the right-edge handle to
  resize, drag the bubble's bottom handle to **aim the tail**, and **double-click
  to edit the words** (this writes back to the Script, so the two never diverge).
  The delivery you pick (Spoken / Shouted / Whispered / Thought / Voice-over / …)
  changes the bubble's look. Add an extra **＋ Balloon** or a **＋ SFX** word
  (sound-effect lettering with size + rotation) per panel.
- **Gutter** — set the whitespace *after* the panel (None / Beat / Pause / Dead
  air, or the slider). This is the webtoon pacing beat; it shows in Compose,
  Preview, and the export.
- **Effects** — pick a one-click **preset** (Dramatic entrance, Rain ambience,
  Impact hit, Slow burn, Deep space) to drop a tuned effect stack, or add effects
  individually. Use the **scrub bar** under the selected panel (▶ or drag) to play
  the panel's scroll pass — reveal, parallax, and transition animate live without
  leaving Compose.

**Reorder panels** by dragging them in the rail (or the ▴▾ buttons). **Undo/redo**
any edit with `Ctrl+Z` / `Ctrl+Shift+Z` (text fields keep their own undo).

### Production → Publish (offline export)
Assign generated images to panels, then **Export offline comic (.html)**. The
export inlines every assigned image, the on-canvas bubbles/captions/SFX, and the
panel gutters, producing a single self-contained file that opens with no internet.
Leave **Bake motion** on to ship the parallax, reveals, and transitions in the
file (it respects a reader's reduced-motion setting); turn it off for a static
scroll-reveal export. The size shown is the real file size; toggle **Downscale**
to shrink it.

## Create an episode from scratch (the whole loop)

The end-to-end recipe, verified working with real generation (2026-06-13):

1. **Series** → ＋ New series — title, logline, genre, palette, canon rules.
2. **Narrative → Characters** → ＋ Add character — name, role, and an **Appearance**
   description (this text drives the art).
3. Click **"Develop ‹name›'s look in Visual Dev"** → the subject is created for you →
   **✦ Generate variant** (pick Flux or SDXL) → **Lock canonical →** on the keeper.
   The portrait appears back in the character's bible automatically.
4. **Narrative → Seasons** → click the episode header to **name your episode** — this
   names the export too.
5. **Narrative → Script** → ＋ Add panel — write narration, **＋ Add dialogue** for
   speaker lines (speakers come from your cast).
6. **Production → Library** → generate scene/background art with a prompt.
7. **Production → Compose** → select each panel → **assign art to layers** (back →
   front), **place the speech bubbles/captions** on the panel, set a **gutter** for
   pacing, and add **effects** (try a preset, then scrub to preview the motion).
8. **Production → Preview** → read it in the phone frame — your real art scrolls with
   live parallax, reveals, and your placed lettering.
9. **Production → Publish** → **⤓ Export offline comic (.html)** (Bake motion on) —
   the file lands in your Downloads and opens anywhere, no internet needed.

## Tips
- A character's LoRA + canonical image are the backbone of consistency — lock a
  canonical and train/assign a LoRA early, then everything else references them.
- If a generation fails you'll get a toast and the placeholder is marked; just
  retry. Cancel mid-generation with the **Cancel** button.
