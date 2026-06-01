# WORDWERX — Project Instructions

## For any new session in this project

Read `VISUAL_DEV_HANDOFF.md` first. It contains:
- Full tech-stack rules (React + Babel inline, no build step, window.* sharing)
- Complete file map
- CSS token reference
- All data model contracts (VISDEV, CHARACTERS, BIBLE, etc.)
- Exact spec for what Visual Dev phase needs to build
- UI vocabulary guide (patterns to match from narrative.jsx)
- Checklist of remaining work

## Current phase: Visual Dev (Phase 3)

The prototype is at `WORDWERX.html`. All workspaces except Visual Dev are complete.
Build out `app/visdev.jsx` following the spec in the handoff doc.

## Key rules (summary)

- Never edit `app/styles.css` (base tokens). Add to `app/styles2.css`.
- All script files use `<script type="text/babel">` — no module imports.
- Share components/data via `Object.assign(window, { ... })` at end of each file.
- Style objects must be uniquely named per file (not `const styles = {}`).
- Use `<Scene kind="...">` for all panel artwork — never raw img tags.
- Match the charcoal dark UI vocabulary — teal (#16d6b4) for locked states, blue (#2563EB) for actions.
