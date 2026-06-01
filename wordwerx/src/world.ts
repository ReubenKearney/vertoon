export const SERIES: any[] = [
  {
    id: 'echo', title: "Echo's Location", genre: 'Solarpunk sci-fi mystery',
    tagline: 'The hour the city starts counting heads.', status: 'In production',
    hue: 285, cover: 'dusk_skyline', format: 'Vertical scroll · vertoon',
    seasons: 2, episodes: 12, published: 3, panels: 148, progress: 0.42,
    palette: ['#1a2740', '#9a5a4e', '#16d6b4', '#caa07a'], styleKey: 'Echo dusk key',
    pov: 'Single POV per episode', updated: '2 hours ago', active: true,
    canon: ['Echo is voice only — no avatar, no omniscience.', 'Night lethality implied, never explained ("the blanket").', 'Solarpunk optimism under surveillance dread.'],
  },
  {
    id: 'tide', title: 'Hollow Tide', genre: 'Folk-horror', status: 'Drafting',
    tagline: 'The town the sea agreed to keep.', hue: 175, cover: 'tunnels',
    format: 'Vertical scroll · vertoon', seasons: 1, episodes: 8, published: 0,
    panels: 41, progress: 0.18, palette: ['#0d1f24', '#1c3a3f', '#5a7d6e', '#cbb894'],
    styleKey: 'Brine & lamp-black', pov: 'Rotating ensemble', updated: 'Yesterday',
    canon: ['The tide is a character — it is owed, never feared aloud.', 'No on-page violence; dread by absence.'],
  },
  {
    id: 'quartz', title: 'Quartz', genre: 'Neon-noir heist', status: 'Visual dev',
    tagline: 'Nine floors down, the city keeps its receipts.', hue: 330, cover: 'night_lockdown',
    format: 'Paged · landscape', seasons: 1, episodes: 6, published: 0,
    panels: 22, progress: 0.09, palette: ['#120a1f', '#3a1145', '#ff2e88', '#34e0ff'],
    styleKey: 'Wet neon / hard shadow', pov: 'Heist crew rotation', updated: '3 days ago',
    canon: ['Every promise is a transaction with a ledger.', 'Colour = allegiance; the crew never share a hue.'],
  },
  {
    id: 'lantern', title: 'The Lantern Index', genre: 'Cozy archive mystery', status: 'Outlining',
    tagline: 'Every light in the archive remembers who lit it.', hue: 60, cover: 'lantern_hub',
    format: 'Vertical scroll · vertoon', seasons: 1, episodes: 4, published: 0,
    panels: 6, progress: 0.04, palette: ['#1a1710', '#3a2f1a', '#e0b552', '#9ad1c4'],
    styleKey: 'Warm vellum / brass', pov: 'Archivist first-person', updated: '1 week ago',
    canon: ['Cozy stakes — the worst loss is a misfiled memory.', 'Each episode opens and closes on the same lamp.'],
  },
];

export const SEASONS: any[] = [
  {
    id: 's1', series: 'echo', n: 1, title: 'Counting Heads',
    premise: 'A routine resin inspection drags Neelai into the machinery that keeps the city alive after dark — and the voice running it.',
    episodes: [
      { id: 'ep1', n: 1, title: 'Wrong Place, Right Voice', status: 'In production', beats: 13, panels: 13, log: 'Neelai is trapped past curfew and saved by a lamplighter and a voice with no face.' },
      { id: 'ep2', n: 2, title: 'The Resin Ledger', status: 'Outlined', beats: 11, panels: 0, log: 'The logbooks point at a supply nobody is admitting to. Neelai goes back in daylight.' },
      { id: 'ep3', n: 3, title: 'Lamplighters', status: 'Outlined', beats: 9, panels: 0, log: 'A night with Wulan\'s crew. How the blanket really gets lit, and who pays for the gaps.' },
      { id: 'ep4', n: 4, title: 'The Sister Signal', status: 'Idea', beats: 4, panels: 0, log: 'Echo slips. A name surfaces in the noise: Indu. Kinship the system was built to deny.' },
      { id: 'ep5', n: 5, title: 'Counting Heads', status: 'Idea', beats: 2, panels: 0, log: 'The census is not counting people. It is counting who can be allowed to go out.' },
      { id: 'ep6', n: 6, title: 'The Hour', status: 'Idea', beats: 1, panels: 0, log: 'Season finale. The city holds its breath for the length of one curfew.' },
    ],
  },
  {
    id: 's2', series: 'echo', n: 2, title: 'Resin & Salt', premise: 'The supply chain leads off-shore. Provisional outline.',
    episodes: [
      { id: 'ep7', n: 1, title: 'Off-Shore', status: 'Idea', beats: 1, panels: 0, log: 'Provisional.' },
      { id: 'ep8', n: 2, title: 'Untitled', status: 'Idea', beats: 0, panels: 0, log: 'Placeholder.' },
    ],
  },
];

export const ARCS: any[] = [
  {
    id: 'physics', label: 'Physics · the cases', hue: 200,
    desc: 'The procedural spine — resin, sensors, the lethal night. Each episode is a solvable case that hides a systemic one.',
    beats: { ep1: 'Resin clue surfaces in the hub logbooks', ep2: 'Ledger contradicts the official supply', ep3: 'A lit gap proves the system is gamed', ep4: 'The signal is data, not a ghost', ep5: 'The census is the real mechanism', ep6: 'One curfew, fully understood' },
  },
  {
    id: 'echo', label: 'Echo · personhood', hue: 285,
    desc: 'A voice fighting to be treated as someone. Strict portrayal rules: no avatar, explicit limits, at least one hesitation.',
    beats: { ep1: 'Hesitates — "…recalculating"', ep2: 'Chooses to keep helping, off-mandate', ep3: 'Admits a limit she could have hidden', ep4: 'A name slips — she has a past', ep5: 'Refuses an order for the first time', ep6: 'Asks to be counted' },
  },
  {
    id: 'indu', label: 'Indu · kinship', hue: 150,
    desc: 'Echo\'s sister inside the operation. Family the system was designed to erase.',
    beats: { ep1: '—', ep2: 'A forensic note in Echo\'s margin', ep3: 'Same handwriting, two places', ep4: 'Indu enters, denying everything', ep5: 'The kinship is leverage', ep6: 'A choice between sister and city' },
  },
  {
    id: 'rajni', label: 'Rajni · control', hue: 25,
    desc: 'The hand on the census. Never villainous on the page — only reasonable, which is worse.',
    beats: { ep1: 'A shutter falls on schedule', ep2: 'The supply was authorised', ep3: 'The gaps are policy, not failure', ep4: 'Echo is an asset, not a person', ep5: 'Counting heads, by design', ep6: 'Reasonableness as the threat' },
  },
];

export const BIBLE: Record<string, any> = {
  echo: { appearance: 'No body to render — voice only. Signature is a cool indigo-to-teal waveform with scanline aberration over darkness. Per canon: never a face.', wants: 'To be treated as someone, not something.', flaw: 'Hides her limits to stay useful.', voice: 'Precise, dry, a half-beat late when she\'s deciding what to withhold.', secret: 'She has a sister inside the operation.', arc: 'Tool → accomplice → person who asks to be counted.', rels: [['indu', 'sister'], ['neelai', 'guides'], ['rajni', 'owned by']] },
  neelai: { appearance: 'Early 20s, Mara. Slight build, expressive face, cropped dark hair. Field jacket over a patterned scarf; press lanyard. Warm skin holds under cold lamp light.', wants: 'A story true enough to matter.', flaw: 'Mistakes proximity for safety.', voice: 'Warm, quick, asks one question too many.', secret: 'Filed the inspection herself to get inside.', arc: 'Reporter on a routine → witness who can\'t unsee the machinery.', rels: [['wulan', 'rescued by'], ['echo', 'guided by']] },
  wulan: { appearance: '50s, Indonesian. Broad, weathered, deliberate. Lamplighter\'s rig: repellent canister on the hip, heat-gloves, headlamp. Often a backlit silhouette.', wants: 'To keep his crew and his conscience.', flaw: 'Would rather fix a lamp than answer a question.', voice: 'Few words, all load-bearing.', secret: 'Knows which gaps are left dark on purpose.', arc: 'Bystander → the one who opens the hatch.', rels: [['neelai', 'rescues'], ['rajni', 'works under']] },
  indu: { appearance: 'Mid-20s, Indonesian. Composed, precise posture. Hair tied back, dark technical coat, forensic gloves. Shares Echo\'s brow — the only visual hint of kinship.', wants: 'To keep the operation clean and her sister buried.', flaw: 'Forensic to the point of cruelty.', voice: 'Clipped, exact, never raises it.', secret: 'Is Echo\'s sister.', arc: 'Denial → leverage → the season\'s hardest choice.', rels: [['echo', 'sister'], ['rajni', 'serves']] },
  kaie: { appearance: 'Early teens, Xingu. Wiry and fast. Climbing harness, taped fingers, hood up. Designed to read in motion and shadow.', wants: 'A way up and out.', flaw: 'Trusts walls more than people.', voice: 'Mostly silence, then everything at once.', secret: 'Has been inside the hub before.', arc: 'Introduced S2.', rels: [] },
  mariama: { appearance: '20s, Songhai. Bald, tall, still. Tailored dark layers, minimal palette — controlled, never flashy.', wants: 'To win without firing a shot.', flaw: 'Restraint reads as coldness.', voice: 'Measured, three moves ahead.', secret: 'Introduced S2.', arc: 'Introduced S2.', rels: [] },
};

function mkVar(v: string, scene: string, hue: number, state: string, note: string) { return { v, scene, hue, state, note }; }

export const VISDEV: any[] = [
  {
    id: 'neelai', subject: 'Neelai', kind: 'Character', scene: 'street_phone', hue: 30,
    brief: 'Young Mara journalist. Curious, expressive. Reads as warm even in cold light.',
    locked: 'v3', variants: [
      mkVar('v1', 'street_phone', 30, 'Explored', 'Too neutral — lost her under the lamp.'),
      mkVar('v2', 'street_phone', 18, 'Explored', 'Warmer key, silhouette unclear.'),
      mkVar('v3', 'street_phone', 30, 'Locked', 'Lamp-lit 3/4, scarf reads at thumbnail size.'),
      mkVar('v4', 'street_phone', 42, 'Candidate', 'Daylight variant for Ep.2.'),
    ],
    sheet: { poses: ['Front', '3/4', 'Profile', 'Reaching'], expressions: ['Neutral', 'Curious', 'Alarmed', 'Resolved'], palette: ['#2a2236', '#e7a87a', '#3a2a30', '#cfe3ff'] },
    history: [{ v: 'v3', when: 'Locked 2h ago', who: 'You' }, { v: 'v2', when: 'Explored yesterday', who: 'Co-pilot' }, { v: 'v1', when: 'Explored yesterday', who: 'Co-pilot' }],
  },
  {
    id: 'wulan', subject: 'Wulan', kind: 'Character', scene: 'rescue', hue: 150,
    brief: 'Middle-aged lamplighter. Practical, grounded. Backlit in the doorway.',
    locked: 'v2', variants: [
      mkVar('v1', 'rescue', 150, 'Explored', 'Gear too clean — looked new, not worked-in.'),
      mkVar('v2', 'rescue', 150, 'Locked', 'Backlit doorway, repellent rig on the hip.'),
      mkVar('v3', 'lanternwrights', 140, 'Candidate', 'Crew variant for Ep.3.'),
    ],
    sheet: { poses: ['Doorway', 'Working', 'Profile'], expressions: ['Steady', 'Wry', 'Grim'], palette: ['#070a12', '#ffe3b0', '#ff9d5a', '#3a4a3e'] },
    history: [{ v: 'v2', when: 'Locked 1d ago', who: 'You' }, { v: 'v1', when: 'Explored 1d ago', who: 'Co-pilot' }],
  },
  {
    id: 'echo', subject: 'Echo', kind: 'Character · voice', scene: 'echo_call', hue: 285,
    brief: 'No avatar — per canon. Her "design" is an audio-visual signature: waveform, aberration, hue.',
    locked: 'v2', variants: [
      mkVar('v1', 'echo_call', 270, 'Explored', 'Read as a face hiding in static — breaks the no-avatar rule.'),
      mkVar('v2', 'echo_call', 285, 'Locked', 'Pure waveform + scanline aberration. No features.'),
      mkVar('v3', 'echo_call', 300, 'Candidate', 'Colder hue for the refusal beat (Ep.5).'),
    ],
    sheet: { poses: ['Idle hum', 'Speaking', 'Hesitation', 'Disconnect'], expressions: ['Calm', 'Strained', 'Withholding', 'Gone'], palette: ['#030308', '#7b61ff', '#16d6b4', '#120e22'] },
    history: [{ v: 'v2', when: 'Locked 3d ago', who: 'You' }, { v: 'v1', when: 'Rejected 3d ago', who: 'You — "no faces"' }],
  },
  {
    id: 'lanternhub', subject: 'Lantern Hub', kind: 'Location', scene: 'lantern_hub', hue: 210,
    brief: 'Interior. Machinery breathing in the dark. The room the season keeps returning to.',
    locked: null, variants: [
      mkVar('v1', 'lantern_hub', 210, 'Candidate', 'Establishing, machinery centre.'),
      mkVar('v2', 'lantern_hub', 200, 'Candidate', 'Logbook nook variant.'),
    ],
    sheet: { poses: ['Wide', 'Logbook nook', 'Machinery'], expressions: [], palette: ['#080a12', '#20263a', '#2a3550', '#16d6b4'] },
    history: [{ v: 'v2', when: 'Explored 2d ago', who: 'Co-pilot' }, { v: 'v1', when: 'Explored 2d ago', who: 'Co-pilot' }],
  },
  {
    id: 'logbook', subject: 'Resin Logbook', kind: 'Prop', scene: 'logbook', hue: 28,
    brief: 'Hand-kept ledger; the rising-resin chart is the visual clue. Must read at panel scale.',
    locked: 'v1', variants: [
      mkVar('v1', 'logbook', 28, 'Locked', 'Aged paper, red rising chart, photographable.'),
      mkVar('v2', 'logbook', 35, 'Explored', 'Cleaner ledger — looked official, lost the "kept by hand".'),
    ],
    sheet: { poses: ['Closed', 'Open — chart', 'Photographed'], expressions: [], palette: ['#0a0910', '#e7ddc8', '#bcae8e', '#8a2f28'] },
    history: [{ v: 'v1', when: 'Locked 4d ago', who: 'You' }],
  },
];

export const COPILOT_X: Record<string, any[]> = {
  series: [
    { q: 'Start a new series', a: 'I can scaffold a series from a one-line premise — genre, format, a starter style-key and three canon rules you can edit. Want me to open the form pre-filled?' },
    { q: 'What needs attention?', a: '"Hollow Tide" has 8 episodes outlined but 0 plates generated. "Quartz" is locked in visual dev with no script. Echo Ep.1 is the only thing in production.' },
  ],
  narrative: [
    { q: 'Check Echo\'s portrayal', a: 'Across Season 1 Echo hesitates in Ep.1, admits a limit in Ep.3, and refuses an order in Ep.5 — the personhood arc escalates cleanly. No avatar slips. On-spec.' },
    { q: 'Find a soft beat', a: 'Ep.4 "The Sister Signal" has only 4 beats and leans on coincidence for the Indu reveal. I\'d seed her handwriting in Ep.2 so the reveal pays off. Insert that beat?' },
  ],
  visual: [
    { q: 'Anything off-model?', a: 'Neelai v4 (daylight) drifts 12° warmer than her locked key — fine for Ep.2 daylight, but flag it if it lands in a night panel. Echo v3 is colder by design.' },
    { q: 'Lock the Lantern Hub', a: 'The Hub appears in 4 episodes but has no locked reference — that\'s your biggest consistency risk. v1 reads best at scale. Promote it to canonical?' },
  ],
};
