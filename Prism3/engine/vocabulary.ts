/**
 * Prism3 engine — DESCRIPTIVE VOCABULARY (#471): words a brand brief already uses, resolved to
 * lever values, with every inference logged.
 *
 * Pure (no `node:*`, no I/O) so it stays on the portable-core side of the fence (docs/07 §3) and
 * runs identically in the browser hosts.
 *
 * THE PROBLEM. `brandTheme({ id, primary, neutral })` produces a complete 575-token system from the
 * three required fields, and logs the 15 decisions it made on your behalf. But a brand brief does
 * not speak in numbers. It says *"corners are generous and the UI is dense"* (aurora), *"restrained
 * on purpose — low chroma"* (harbor), *"bold, not loud"* (wendys). Nothing carried that intent to a
 * lever: `design.md` prose is parsed and discarded, and the 9 slider levers had no vocabulary at
 * all, so an agent working from a brief had to invent a number — and its guess went unrecorded,
 * which is the part that matters. A *logged* default is auditable; a guessed one is not.
 *
 * TWO LAYERS, and the seam between them is deliberate.
 *
 *  1. NAMED STOPS (`SLIDER_STOPS`) — `radiusScale: 'soft'` instead of `1.5`. An assertion about one
 *     lever. An unknown stop name THROWS: the author believes they set that lever, so silently
 *     ignoring it would be the worst outcome.
 *  2. PERSONALITY (`TRAITS`) — `personality: ['soft', 'generous']`, a cross-cutting brand trait that
 *     fills SEVERAL levers at once.
 *
 * BOTH throw on an unrecognized word, and the second one only after a false start. The first cut
 * treated an unknown trait leniently — recorded as a note, generation continues — on the reasoning
 * that a brief should not be brittle over a word the engine merely does not know. But
 * `theme-schema.json` declares `personality` as a closed enum, so the two enforcement points
 * disagreed: anything arriving through the CLI or MCP was already hard-rejected, and the lenient
 * branch was reachable only from the in-memory hosts. Two enforcement points that differ is worse
 * than either rule alone. The enum wins, for a reason specific to who calls this: **for an agent, a
 * hard error listing the nine valid traits is a better signal than a note it may never read** — it
 * closes the loop in one turn. Thrown here as well as declared in the schema, because `brandTheme`
 * is also called with in-memory input that never touched schema validation (same reasoning as the
 * `root` slug check).
 *
 * The words are a CONTROLLED vocabulary, not a place to paste brief adjectives. Harbor's brief opens
 * "Trustworthy, calm, maritime" and only `calm` is a trait here; an agent maps the other two onto
 * `restrained` rather than passing them through. That is the seam working as intended, not a gap.
 *
 * WHY NOT SCAN THE PROSE. Keyword-matching free text misfires exactly where briefs are richest —
 * "we avoid anything playful", "less rounded than our old site" — and it would put a fuzzy step at
 * the center of an engine whose whole claim is that every decision is deterministic and auditable.
 * An agent reads the prose and maps it to this controlled vocabulary; the engine resolves the
 * vocabulary. **The fuzzy step stays in the agent, the auditable step stays in the engine.** This is
 * the same seam `standardToBrandInput` already draws between a loose input and a precise BrandInput.
 *
 * WHERE THE WORDS COME FROM. Not invented — read off the three example briefs, which annotate their
 * own mapping ("*energetic* → snappy tempo; *premium restraint* → tighter tracking"). Every trait
 * below is attested in `Prism3/examples/*.design.md`; the `why` string cites it. A tenth candidate
 * (`confident`, in both aurora and wendys) was dropped as redundant against `bold` rather than
 * shipped for the sake of a rounder number.
 */

/** Named stops for the slider levers where a word genuinely names a design intent.
 *
 *  Deliberately NOT all nine sliders. `layout.columns`, `disabledMin` and `baseMd` are bare
 *  quantities that no adjective describes better than the number does — a 3:1 contrast floor is not
 *  "gentle" — and inventing words for them would make the vocabulary look complete while making it
 *  worse. Every value here is on its lever's declared step grid (see `levers.ts`).
 *
 *  `neutral.hue` carries only the two poles the briefs actually use (harbor: *"the greys lean warm
 *  even though the brand runs cool"*). Hue is a circle and "warm" is an arc, not a point, so this is
 *  the least precise entry here; it is included because it is attested and useful, and named `warm`
 *  /`cool` rather than pretending to more resolution than it has. */
export const SLIDER_STOPS: Record<string, Record<string, number>> = {
  radiusScale: { sharp: 0, modest: 0.5, standard: 1, soft: 1.5, round: 2 },
  'shadow.softness': { crisp: 0.4, standard: 1, soft: 1.4, diffuse: 2 },
  'neutral.chroma': { pure: 0, subtle: 0.006, tinted: 0.012, saturated: 0.02 },
  'neutral.hue': { warm: 60, cool: 250 },
  'layout.containerMax': { narrow: 1120, standard: 1440, wide: 1680, full: 1920 },
  'layout.containerNarrow': { tight: 600, standard: 720, generous: 840, wide: 960 },
};

/** A brand trait: the levers it implies, and the brief language it was read from. */
export type Trait = {
  /** Lever path → value. A string is either a stop name in `SLIDER_STOPS` or a literal enum value. */
  levers: Record<string, number | string>;
  /** Cited justification. Ships in the note, so a reader can audit the inference, not just see it. */
  why: string;
};

/**
 * The controlled vocabulary. Nine traits, each touching **two or more** levers — a trait that moved
 * a single lever would just be a slower way to write a named stop.
 *
 * Slider targets are written as STOP NAMES rather than numbers, which makes an invariant structural
 * instead of coincidental: `personality: ['soft']` and `radiusScale: 'soft'` must set the same
 * value, because both resolve through `SLIDER_STOPS`. `test.ts` asserts it.
 */
export const TRAITS: Record<string, Trait> = {
  energetic: {
    levers: { 'motionPersonality.tempo': 'snappy', 'typography.typeScale': 'expressive' },
    why: 'aurora: "Energetic, premium, confident … Motion is quick and responsive (snappy)"; wendys: "high-energy"',
  },
  calm: {
    levers: { 'motionPersonality.tempo': 'relaxed', neutralEmphasis: 'subtle' },
    why: 'harbor: "Trustworthy, calm … Motion is unhurried (relaxed)"; aurora: "the working UI should feel calm and precise"',
  },
  premium: {
    levers: { 'typography.typeScale': 'expressive', 'shadow.softness': 'crisp', neutralEmphasis: 'subtle' },
    // Citation deliberately TRUNCATED rather than reworded: the clause that follows in aurora's
    // brief ends on an en-GB spelling, and a `why` string is inlined into `apps/studio/dist/main.js` where
    // the US-English gate rightly fails it. Quoting an en-GB source into US-gated shipped prose is a
    // real tension; shortening the quote keeps it faithful, where editing the words would not. (This
    // comment is phrased around the word rather than using it for the same reason — engine prose
    // reaches the bundle whether it is a string or a comment.)
    why: 'aurora: "Energetic, premium, confident" + "premium restraint → tighter tracking"',
  },
  restrained: {
    levers: { neutralEmphasis: 'subtle', 'neutral.chroma': 'subtle', 'shadow.softness': 'crisp' },
    why: 'harbor: "The palette is restrained on purpose — low chroma, nothing that fights the content"',
  },
  bold: {
    levers: { neutralEmphasis: 'strong', 'typography.typeScale': 'expressive', 'typography.displayCeiling': '3xl' },
    why: 'wendys: "Bold, not loud — confident use of the red on white" + "Confident hierarchy"',
  },
  generous: {
    levers: { density: 'spacious', radiusScale: 'round', 'layout.containerNarrow': 'generous' },
    why: 'aurora: "Corners are generous"; wendys: "Confident hierarchy, generous whitespace"',
  },
  dense: {
    levers: { density: 'compact', 'layout.containerMax': 'wide' },
    why: 'aurora: "the UI is dense: this is a tool people live in, so more fits on screen without feeling cramped"',
  },
  soft: {
    levers: { radiusScale: 'soft', 'shadow.softness': 'soft' },
    why: 'aurora: "The page is a soft, tinted off-white … the product should feel considered, not clinical"',
  },
  sharp: {
    levers: { radiusScale: 'sharp', 'shadow.softness': 'crisp' },
    why: 'the opposite pole of `soft`, so a brief can state the intent rather than only its absence',
  },
};

export type Resolution = { input: unknown; notes: string[] };

const getPath = (obj: any, path: string): unknown => {
  let node = obj;
  for (const seg of path.split('.')) { if (node == null || typeof node !== 'object') return undefined; node = node[seg]; }
  return node;
};

const setPath = (obj: any, path: string, value: unknown): void => {
  const segs = path.split('.');
  let node = obj;
  for (const seg of segs.slice(0, -1)) { if (node[seg] == null || typeof node[seg] !== 'object') node[seg] = {}; node = node[seg]; }
  node[segs[segs.length - 1]] = value;
};

/** Resolve a stop NAME on a lever, or throw naming what was valid. Numbers pass straight through. */
export const resolveStop = (lever: string, value: unknown): number => {
  if (typeof value === 'number') return value;
  const stops = SLIDER_STOPS[lever];
  if (!stops) throw new Error(`lever '${lever}' takes a number, not the name '${String(value)}'`);
  const hit = stops[String(value)];
  if (hit === undefined) {
    throw new Error(`unknown value '${String(value)}' for '${lever}' — expected a number or one of: ${Object.keys(stops).join(', ')}`);
  }
  return hit;
};

/**
 * Resolve named stops and personality traits into plain lever values on a COPY of the input.
 *
 * PRECEDENCE, and it is the rule that makes the layer safe to add: **an explicitly set lever always
 * wins.** Personality only fills what the brief left absent, and says so when it declines. Between
 * traits, the first listed wins — order is the author's stated priority, and a later trait that
 * wanted the same lever is reported rather than silently dropped. Without both rules, adding
 * `personality` to an existing brief could quietly change a value the author had already chosen,
 * which is the one thing an advisory layer must never do.
 */
export const resolveVocabulary = (raw: unknown): Resolution => {
  const notes: string[] = [];
  if (!raw || typeof raw !== 'object') return { input: raw, notes };
  const input: any = JSON.parse(JSON.stringify(raw));

  // ---- 1. named stops on explicitly-set sliders ----
  for (const lever of Object.keys(SLIDER_STOPS)) {
    const current = getPath(input, lever);
    if (typeof current === 'string') {
      const resolved = resolveStop(lever, current);
      setPath(input, lever, resolved);
      notes.push(`${lever} '${current}' → ${resolved}`);
    }
  }

  // ---- 2. personality traits fill what is still absent ----
  const personality = input.personality;
  if (personality === undefined) return { input, notes };
  if (!Array.isArray(personality)) {
    throw new Error(`personality must be a list of traits, got ${typeof personality} — e.g. personality: ['calm', 'restrained']`);
  }

  // Which lever each applied trait claimed, so a later trait can report the collision by name
  // rather than vanishing.
  const claimedBy = new Map<string, string>();
  for (const name of personality) {
    const trait = TRAITS[String(name)];
    if (!trait) {
      throw new Error(`unknown personality trait '${String(name)}' — expected one of: ${Object.keys(TRAITS).join(', ')}`);
    }
    const applied: string[] = [];
    const declined: string[] = [];
    for (const [lever, value] of Object.entries(trait.levers)) {
      // `claimedBy` is checked BEFORE presence, and the order is load-bearing: once a trait applies a
      // lever it IS present in `input`, so a presence-first test reports every trait-vs-trait
      // collision as "set explicitly" and credits the author for a choice the engine made. An audit
      // trail that misattributes is worse than none. (Found by running the resolver, not by reading
      // it — the branch was unreachable and looked fine.)
      const owner = claimedBy.get(lever);
      if (owner) { declined.push(`${lever} (already set by '${owner}')`); continue; }
      if (getPath(input, lever) !== undefined) { declined.push(`${lever} (set explicitly)`); continue; }
      const resolved = SLIDER_STOPS[lever] ? resolveStop(lever, value) : value;
      setPath(input, lever, resolved);
      claimedBy.set(lever, String(name));
      applied.push(`${lever} ${resolved}`);
    }
    const head = applied.length ? `personality '${String(name)}' → ${applied.join(', ')}` : `personality '${String(name)}' → nothing to fill`;
    notes.push(`${head}${declined.length ? `; kept ${declined.join(', ')}` : ''} [${trait.why}]`);
  }
  // `personality` is an authoring-layer field, not a lever — it has done its job and must not reach
  // the theme builder, which would not know what to do with it.
  delete input.personality;
  return { input, notes };
};
