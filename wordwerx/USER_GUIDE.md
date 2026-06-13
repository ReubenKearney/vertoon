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

### Production → Publish (offline export)
Assign generated images to panels, then **Export offline comic (.html)**. The
export inlines every assigned image and bakes in the scroll-reveal, producing a
single self-contained file that opens with no internet. The size shown is the
real file size; toggle **Downscale** to shrink it.

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
7. **Production → Compose** → select each panel → in the inspector, **assign art to
   layers** (back → front) from the dropdown.
8. **Production → Publish** → **⤓ Export offline comic (.html)** — the file lands in
   your Downloads and opens anywhere, no internet needed.

## Tips
- A character's LoRA + canonical image are the backbone of consistency — lock a
  canonical and train/assign a LoRA early, then everything else references them.
- If a generation fails you'll get a toast and the placeholder is marked; just
  retry. Cancel mid-generation with the **Cancel** button.
