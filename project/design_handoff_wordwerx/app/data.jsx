// data.jsx — project model for WORDWERX, populated from "Echo's Location" Ep.1
// Exposed on window for the other babel scripts.

// ---- Effect vocabulary (drives the authoring UI) -------------------------
const EFFECT_TYPES = {
  reveal: {
    label: 'Scroll Reveal', glyph: '◔', hue: 285,
    blurb: 'Animate a layer in as it crosses the read line.',
    params: {
      Motion: { type: 'enum', options: ['Fade', 'Slide up', 'Slide left', 'Scale in', 'Blur in'], value: 'Slide up' },
      Distance: { type: 'range', min: 0, max: 160, unit: 'px', value: 48 },
      Duration: { type: 'range', min: 0.1, max: 2.5, step: 0.1, unit: 's', value: 0.8 },
      Easing: { type: 'enum', options: ['ease-out', 'ease-in-out', 'spring', 'linear'], value: 'ease-out' },
    },
  },
  parallax: {
    label: 'Parallax Depth', glyph: '▤', hue: 200,
    blurb: 'Layers drift at different rates to fake camera depth.',
    params: {
      Strength: { type: 'range', min: 0, max: 100, unit: '%', value: 60 },
      Axis: { type: 'enum', options: ['Vertical', 'Horizontal', 'Both'], value: 'Vertical' },
      Anchor: { type: 'enum', options: ['Center', 'Top', 'Bottom'], value: 'Center' },
    },
  },
  transition: {
    label: 'Panel Transition', glyph: '◧', hue: 250,
    blurb: 'How this panel hands off to the next.',
    params: {
      Type: { type: 'enum', options: ['Hard cut', 'Cross dissolve', 'Wipe down', 'Iris', 'Whip pan'], value: 'Cross dissolve' },
      Length: { type: 'range', min: 0, max: 2, step: 0.1, unit: 's', value: 0.6 },
    },
  },
  loop: {
    label: 'Ambient Loop', glyph: '∿', hue: 175,
    blurb: 'A continuous looping effect layered on the panel.',
    params: {
      Kind: { type: 'enum', options: ['Rain', 'Insect swarm', 'Lamp flicker', 'Breathing', 'Dust drift', 'Static'], value: 'Insect swarm' },
      Density: { type: 'range', min: 0, max: 100, unit: '%', value: 55 },
      Speed: { type: 'range', min: 0.2, max: 3, step: 0.1, unit: '×', value: 1 },
    },
  },
  sound: {
    label: 'Sound Cue', glyph: '♪', hue: 150,
    blurb: 'Ambient bed or one-shot SFX, triggered on scroll.',
    params: {
      Source: { type: 'enum', options: ['Ambient — city dusk', 'Ambient — tunnel hum', 'SFX — glass break', 'SFX — mosquito whine', 'SFX — hatch slam', 'VO — Echo'], value: 'Ambient — city dusk' },
      Trigger: { type: 'enum', options: ['On enter', 'On exit', 'On tap', 'Continuous'], value: 'On enter' },
      Volume: { type: 'range', min: 0, max: 100, unit: '%', value: 70 },
    },
  },
  impact: {
    label: 'Impact / Shake', glyph: '✦', hue: 25,
    blurb: 'Camera shake + flash for a beat of force.',
    params: {
      Intensity: { type: 'range', min: 0, max: 100, unit: '%', value: 45 },
      Flash: { type: 'enum', options: ['None', 'White', 'Red', 'Black'], value: 'White' },
      Trigger: { type: 'enum', options: ['On enter', 'On tap'], value: 'On enter' },
    },
  },
  tap: {
    label: 'Interactivity', glyph: '⊙', hue: 300,
    blurb: 'A hotspot the reader taps to reveal or branch.',
    params: {
      Action: { type: 'enum', options: ['Reveal hidden layer', 'Show caption', 'Branch path', 'Play sound'], value: 'Reveal hidden layer' },
      Hint: { type: 'enum', options: ['Pulse ring', 'Glow', 'None'], value: 'Pulse ring' },
    },
  },
  pacing: {
    label: 'Pacing Hold', glyph: '⏸', hue: 60,
    blurb: 'Slow or lock the scroll to control the beat.',
    params: {
      Mode: { type: 'enum', options: ['Hold beat', 'Scroll-lock', 'Slow scrub'], value: 'Hold beat' },
      Length: { type: 'range', min: 0.2, max: 4, step: 0.1, unit: 's', value: 1.4 },
    },
  },
};

function mkFx(type, over) {
  const base = EFFECT_TYPES[type];
  const params = {};
  for (const k in base.params) params[k] = base.params[k].value;
  return Object.assign({ id: type + '_' + Math.random().toString(36).slice(2, 7), type, on: true, params }, over);
}

// ---- Characters (from the imported story bible) --------------------------
const CHARACTERS = [
  { id: 'echo', name: 'Echo', role: 'Hybrid consciousness · I', tint: 285, desc: 'Voice only. No avatar. Obscured in shadow, digital aberration over the eyes.', state: 'Generated' },
  { id: 'neelai', name: 'Neelai', role: 'Journalist · They', tint: 30, desc: 'Young Mara woman. Curious, expressive, emotionally intelligent.', state: 'Generated' },
  { id: 'wulan', name: 'Wulan', role: 'Lamplighter · They', tint: 150, desc: 'Middle-aged Indonesian man. Practical, grounded, morally steady.', state: 'Generated' },
  { id: 'indu', name: 'Indu Khanna', role: 'Operative · We', tint: 200, desc: "Young Indonesian woman. Forensic rationality. Echo's sister.", state: 'Draft' },
  { id: 'kaie', name: 'Kaie', role: 'Infiltrator · They', tint: 95, desc: 'Young Xingu boy. Acrobatics, climbing, evasion.', state: 'Queued' },
  { id: 'mariama', name: 'Mariama', role: 'Strategist · They', tint: 320, desc: 'Bald young Songhai woman. Political cognition, restraint.', state: 'Queued' },
];

// ---- The episode: a vertical sequence of vertoon panels ------------------
const EPISODE = {
  id: 'ep1', series: "Echo's Location", title: 'Wrong Place, Right Voice',
  number: 'Episode 01', genre: 'Solarpunk sci-fi mystery',
  logline: 'Neelai investigates a rumour about censers going out on the fringes of Sulawesi — and is saved by Wulan and Echo.',
};

const PANELS = [
  {
    id: 'p0', n: 0, slug: 'PARALLAX — DEPTH TEST', scene: 'parallax_demo', beat: 'Demo', dur: '—',
    caption: 'Scroll this panel — the near plane races ahead of the far one against the fixed frame. That gap is the depth.',
    layers: [
      { name: 'Background', depth: 0.0 }, { name: 'Far plane', depth: 0.3 },
      { name: 'Mid plane', depth: 0.95 }, { name: 'Near plane', depth: 1.9 },
    ],
    fx: [mkFx('parallax', { params: { Strength: 100, Axis: 'Vertical', Anchor: 'Center' } })],
  },
  {
    id: 'p1', n: 1, slug: 'EXT. SULAWESI — DUSK', scene: 'dusk_skyline', beat: 'Establishing', dur: '4.0s',
    caption: 'Sulawesi. Dusk. The hour the city starts counting heads.',
    layers: [
      { name: 'Dusk sky', depth: 0.0 }, { name: 'Far skyline', depth: 0.25 },
      { name: 'Lamp towers', depth: 0.55 }, { name: 'Foreground haze', depth: 0.9 },
    ],
    fx: [mkFx('reveal', { params: { Motion: 'Blur in', Distance: 0, Duration: 1.6, Easing: 'ease-out' } }),
         mkFx('parallax', { params: { Strength: 70, Axis: 'Vertical', Anchor: 'Center' } }),
         mkFx('sound', { params: { Source: 'Ambient — city dusk', Trigger: 'On enter', Volume: 65 } })],
  },
  {
    id: 'p2', n: 2, slug: 'NEELAI — ON THE LINE', scene: 'street_phone', beat: 'Cold open', dur: '5.5s',
    caption: '', speaker: 'NEELAI', dialogue: '"The lamp sensors are fine, Mara. Routine. I\'ll have the resin piece by morning."',
    layers: [{ name: 'Street', depth: 0.2 }, { name: 'Lamp glow', depth: 0.45 }, { name: 'Neelai', depth: 0.7 }, { name: 'Phone glow', depth: 0.85 }],
    fx: [mkFx('reveal', { params: { Motion: 'Slide up', Distance: 60, Duration: 0.9, Easing: 'ease-out' } }),
         mkFx('parallax', { params: { Strength: 45 } }),
         mkFx('loop', { params: { Kind: 'Lamp flicker', Density: 40, Speed: 0.8 } })],
  },
  {
    id: 'p3', n: 3, slug: 'LANTERNWRIGHTS', scene: 'lanternwrights', beat: 'Worldbuild', dur: '4.5s',
    caption: 'Lanternwrights move in full gear. The blanket is coming.',
    layers: [{ name: 'Backlight', depth: 0.1 }, { name: 'Figures', depth: 0.5 }, { name: 'Lamp halos', depth: 0.7 }],
    fx: [mkFx('reveal', { params: { Motion: 'Fade', Distance: 0, Duration: 1.2 } }),
         mkFx('loop', { params: { Kind: 'Lamp flicker', Density: 60, Speed: 1 } }),
         mkFx('tap', { params: { Action: 'Show caption', Hint: 'Glow' } })],
  },
  {
    id: 'p4', n: 4, slug: 'THE CITY LOCKS DOWN', scene: 'night_lockdown', beat: 'Turn', dur: '4.0s',
    caption: 'Shutters fall block by block. Lamps ignite.',
    layers: [{ name: 'Night sky', depth: 0.0 }, { name: 'Skyline', depth: 0.3 }, { name: 'Lamp grid', depth: 0.6 }],
    fx: [mkFx('transition', { params: { Type: 'Wipe down', Length: 0.9 } }),
         mkFx('parallax', { params: { Strength: 55 } }),
         mkFx('pacing', { params: { Mode: 'Slow scrub', Length: 1.6 } })],
  },
  {
    id: 'p5', n: 5, slug: 'INT. LANTERN HUB', scene: 'lantern_hub', beat: 'Inciting', dur: '6.0s',
    caption: 'She breaks the seal. Machinery breathes in the dark.',
    layers: [{ name: 'Interior', depth: 0.15 }, { name: 'Machinery', depth: 0.5 }, { name: 'Logbook (hidden)', depth: 0.8 }],
    fx: [mkFx('reveal', { params: { Motion: 'Slide left', Distance: 80, Duration: 1 } }),
         mkFx('tap', { params: { Action: 'Reveal hidden layer', Hint: 'Pulse ring' } }),
         mkFx('sound', { params: { Source: 'SFX — glass break', Trigger: 'On tap', Volume: 80 } }),
         mkFx('loop', { params: { Kind: 'Breathing', Density: 30, Speed: 0.6 } })],
  },
  {
    id: 'p6', n: 6, slug: 'THE LOGBOOKS', scene: 'logbook', beat: 'Discovery', dur: '5.0s',
    caption: 'Resin concentration, climbing every week. She photographs the pages.',
    layers: [{ name: 'Desk', depth: 0.2 }, { name: 'Logbook', depth: 0.6 }, { name: 'Rising chart', depth: 0.75 }],
    fx: [mkFx('reveal', { params: { Motion: 'Scale in', Distance: 0, Duration: 0.9 } }),
         mkFx('tap', { params: { Action: 'Branch path', Hint: 'Pulse ring' } }),
         mkFx('pacing', { params: { Mode: 'Hold beat', Length: 1.2 } })],
  },
  {
    id: 'p7', n: 7, slug: 'THE BLANKET', scene: 'mosquito', beat: 'Escalation', dur: '3.0s',
    caption: 'A single mosquito settles on her wrist. Protection has failed.',
    layers: [{ name: 'Skin', depth: 0.3 }, { name: 'Mosquito', depth: 0.8 }],
    fx: [mkFx('impact', { params: { Intensity: 65, Flash: 'White', Trigger: 'On enter' } }),
         mkFx('sound', { params: { Source: 'SFX — mosquito whine', Trigger: 'On enter', Volume: 85 } }),
         mkFx('loop', { params: { Kind: 'Insect swarm', Density: 70, Speed: 1.4 } })],
  },
  {
    id: 'p8', n: 8, slug: 'INTO THE TUNNELS', scene: 'tunnels', beat: 'Crisis', dur: '5.0s',
    caption: 'She runs. The access tunnels swallow the light.',
    layers: [{ name: 'Tunnel deep', depth: 0.1 }, { name: 'Tunnel rings', depth: 0.5 }, { name: 'Near wall', depth: 0.9 }],
    fx: [mkFx('parallax', { params: { Strength: 90, Axis: 'Both' } }),
         mkFx('loop', { params: { Kind: 'Static', Density: 35, Speed: 1.6 } }),
         mkFx('sound', { params: { Source: 'Ambient — tunnel hum', Trigger: 'Continuous', Volume: 60 } })],
  },
  {
    id: 'p9', n: 9, slug: 'ECHO CALLS', scene: 'echo_call', beat: 'Lifeline', dur: '6.5s',
    caption: '', speaker: 'ECHO', dialogue: '"Don\'t open it. The sensors outside are— …recalculating. Give me three seconds."',
    layers: [{ name: 'Void', depth: 0.0 }, { name: 'Waveform', depth: 0.6 }, { name: 'Aberration', depth: 0.9 }],
    fx: [mkFx('reveal', { params: { Motion: 'Fade', Distance: 0, Duration: 1 } }),
         mkFx('sound', { params: { Source: 'VO — Echo', Trigger: 'On enter', Volume: 90 } }),
         mkFx('pacing', { params: { Mode: 'Scroll-lock', Length: 2.2 } })],
  },
  {
    id: 'p10', n: 10, slug: 'LOCKED', scene: 'locked_hatch', beat: 'Silence', dur: '4.0s',
    caption: 'The hatch is sealed. Echo goes quiet. Nothing she can do.',
    layers: [{ name: 'Dark', depth: 0.1 }, { name: 'Hatch', depth: 0.6 }],
    fx: [mkFx('pacing', { params: { Mode: 'Hold beat', Length: 2.6 } }),
         mkFx('transition', { params: { Type: 'Iris', Length: 1.1 } })],
  },
  {
    id: 'p11', n: 11, slug: 'WULAN', scene: 'rescue', beat: 'Rescue', dur: '4.5s',
    caption: 'The door opens from the other side. A spray of repellent. A hand.',
    layers: [{ name: 'Doorway light', depth: 0.2 }, { name: 'Wulan', depth: 0.55 }, { name: 'Spray', depth: 0.85 }],
    fx: [mkFx('impact', { params: { Intensity: 35, Flash: 'White', Trigger: 'On enter' } }),
         mkFx('reveal', { params: { Motion: 'Scale in', Distance: 0, Duration: 0.7 } }),
         mkFx('sound', { params: { Source: 'SFX — hatch slam', Trigger: 'On enter', Volume: 75 } })],
  },
  {
    id: 'p12', n: 12, slug: 'SEALED', scene: 'aftermath', beat: 'Resolution', dur: '5.0s',
    caption: 'Sealed shut. Conscious, disoriented. An unspoken recognition. Echo disconnects.',
    layers: [{ name: 'Dim interior', depth: 0.2 }, { name: 'Two figures', depth: 0.6 }],
    fx: [mkFx('reveal', { params: { Motion: 'Fade', Distance: 0, Duration: 1.6 } }),
         mkFx('transition', { params: { Type: 'Cross dissolve', Length: 1.4 } })],
  },
];

// ---- Library assets ------------------------------------------------------
const LIBRARY = [
  { id: 'a1', kind: 'Background', scene: 'dusk_skyline', name: 'Sulawesi skyline — dusk', source: 'AI', tags: ['establishing', 'city'], state: 'Generated' },
  { id: 'a2', kind: 'Background', scene: 'night_lockdown', name: 'Skyline — night lockdown', source: 'AI', tags: ['city', 'night'], state: 'Generated' },
  { id: 'a3', kind: 'Background', scene: 'lantern_hub', name: 'Lantern hub interior', source: 'AI', tags: ['interior'], state: 'Generated' },
  { id: 'a4', kind: 'Background', scene: 'tunnels', name: 'Access tunnels', source: 'AI', tags: ['interior', 'chase'], state: 'Generated' },
  { id: 'a5', kind: 'Character', scene: 'street_phone', name: 'Neelai — street', source: 'AI', tags: ['neelai'], state: 'Generated' },
  { id: 'a6', kind: 'Character', scene: 'rescue', name: 'Wulan — doorway', source: 'AI', tags: ['wulan'], state: 'Generated' },
  { id: 'a7', kind: 'FX plate', scene: 'echo_call', name: 'Echo waveform plate', source: 'AI', tags: ['echo', 'voice'], state: 'Generated' },
  { id: 'a8', kind: 'Prop', scene: 'logbook', name: 'Resin logbook + chart', source: 'AI', tags: ['prop', 'clue'], state: 'Generated' },
  { id: 'a9', kind: 'Background', scene: 'lanternwrights', name: 'Lanternwrights at dusk', source: 'Stock', tags: ['crowd'], state: 'Linked' },
  { id: 'a10', kind: 'FX plate', scene: 'mosquito', name: 'Insect swarm overlay', source: 'Stock', tags: ['fx', 'loop'], state: 'Linked' },
  { id: 'a11', kind: 'Background', scene: 'locked_hatch', name: 'Sealed hatch', source: 'AI', tags: ['interior'], state: 'Draft' },
  { id: 'a12', kind: 'FX plate', scene: 'tunnels', name: 'Film grain — heavy', source: 'Stock', tags: ['grade'], state: 'Linked' },
];

// ---- Co-pilot canned suggestions per stage -------------------------------
const COPILOT = {
  story: [
    { q: 'Tighten the logline', a: 'Your inciting incident (the mosquito) lands late. Consider seeding "the blanket" euphemism one beat earlier so the failure reads as dread, not surprise.' },
    { q: 'Echo portrayal check', a: 'Panel 9 keeps Echo voice-only with a visible hesitation ("…recalculating"). On-spec with your bible. Want me to draft an alt line with a harder recalculation?' },
  ],
  library: [
    { q: 'Generate missing plates', a: 'Indu and Kaie are still Queued. I can batch 4 variations each in your dusk palette. Generate now?' },
    { q: 'Match grade across panels', a: 'Panels 5–8 drift warmer than your dusk key. Apply a unified night grade?' },
  ],
  compose: [
    { q: 'Pace the crisis', a: 'Panels 7→10 run fast. I\'d add a Hold beat before the hatch (panel 10) and a Scroll-lock on Echo\'s call. Apply suggested pacing?' },
    { q: 'Suggest a transition', a: 'An Iris close into panel 10 ("Locked") would mirror the silence. Want me to set it?' },
  ],
  preview: [
    { q: 'Readability pass', a: 'Caption contrast on panel 2 dips below AA over the lamp glow. Add a scrim behind dialogue?' },
  ],
  publish: [
    { q: 'Optimise for share', a: 'Bundle is 14 panels, ~2.1MB. I can lazy-load FX plates so first paint is under 400KB. Enable?' },
  ],
};

Object.assign(window, { EFFECT_TYPES, mkFx, CHARACTERS, EPISODE, PANELS, LIBRARY, COPILOT });
