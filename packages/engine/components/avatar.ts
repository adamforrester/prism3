/**
 * Avatar — the picture of a specific person or organization, with a fallback chain: an image, then initials, then a
 * generic glyph (#4110, owner decisions OD-A1 to OD-A8, all A, 2026-11-19; wireframe in #4148).
 *
 * KB brief: `components/avatar.md`. Category `foundations`, the brief's.
 *
 * ── WHAT IT IS AND IS NOT ───────────────────────────────────────────────────────────────────────
 *
 * An identity mark: who something belongs to. Not an Icon (a symbol for an action or a concept: a silhouette on a
 * "Profile" link is an icon) and not an Image (content media with no identity). The entity type is the `shape` prop,
 * not a second component: a circle for a person, a square for a team, an organization or an app (OD-A2 A). The
 * face-pile (AvatarGroup) is its own composed component, deferred (OD-A1 A).
 *
 * ── THE STRUCTURAL DECISION: AN UNCLIPPED CONTAINER, A CLIPPING MASK ────────────────────────────
 *
 * The presence dot overhangs the avatar's edge, so the box that clips the picture cannot be the box that holds the
 * dot. `container` (the root) is the bounding square, the size binding and the corner the dot pins to, and it clips
 * nothing. `mask` is the shape: the corner radius, `clipsContent`, and the backdrop fill a photo is dropped onto (the
 * Image placeholder's native-fill model). The proposal named the root `host`; the root list is closed (Q365), so it is
 * `container`, the role list's own word for a component's bounding box.
 *
 * ── THE SIZES (OD-A3 A) ─────────────────────────────────────────────────────────────────────────
 *
 * The brief's scale, 20 / 24 / 32 / 40 / 64. The first four bind the icon ladder (`icon.size.sm` … `.xl`), so an
 * avatar fits any icon slot (Button's leading visual names an avatar); x-large binds `icon.size.2xl`, the one token
 * this build mints (CONTRACT 15.2.0). The words are the brief's, so `x-small` is 20px here where Icon's `x-small` is
 * 16px: an avatar's rungs are named for the avatar, not for the glyph ladder they bind.
 *
 * ── THE PRESENCE DOT (OD-A7 A) ──────────────────────────────────────────────────────────────────
 *
 * Badge at `type=dot`, nested in a ring: a small box in the page color, `space.025` (2px) of padding around the 8px
 * dot, so the dot reads over a photo. The ring is pinned into the container's bottom-right corner (`corner`, the
 * textarea grip's pin, extended to a box for this def), outside the mask. Badge's dot carries no stroke of its own in
 * Figma (its code draws a canvas-colored stroke over a host), so the ring is drawn here. The dot's tone is Badge's,
 * exposed on the instance (`nest-exposed`, `tone`), so a designer picks the color from the avatar's panel.
 *
 * ── THE PAINT ───────────────────────────────────────────────────────────────────────────────────
 *
 * One neutral backdrop for everyone (OD-A5 A): `color.background.tertiary`. The initials are `color.text.primary` on
 * it and held to 4.5:1 in every mode (`test.ts`, `#4110 avatar`); the glyph is `color.icon.secondary`, decorative.
 */
import { ComponentDef } from '../component-schema';

// The five sizes, led by medium (the code default) and then smallest to largest (#2752, Q1 B).
const SIZES = ['medium', 'x-small', 'small', 'large', 'x-large'] as const;

export const avatar: ComponentDef = {
  id: 'avatar',
  name: 'Avatar',
  aliases: ['user-avatar', 'profile-picture', 'profile-image', 'avatar-image'],
  category: 'foundations',
  status: 'draft',
  summary: 'A person or organization, shown as a photo, initials or a generic glyph, in that order.',
  description:
    'The picture of a specific person or organization. It shows a photo when there is one, the initials of the name when there is not, and a generic glyph when there is no name either: a person in a circle, an organization in a square. The circle is for a person and the square for a team, an organization or an app. Five sizes, from 20px in a dense list to 64px in a profile header. An optional presence dot sits on the bottom corner, outside the picture, so it is never cut off. An avatar is not interactive: one that opens a menu is a button holding an avatar.',

  props: [
    { name: 'name', type: 'string', required: true, description: 'The person or organization the avatar shows, exactly as the interface writes it next to the avatar. It is the accessible name and the source of the initials, so it stays the same when the photo fails to load.' },
    { name: 'src', type: 'string', required: false, description: 'The photo. When it is missing or fails to load, the avatar shows the initials, or the glyph when there is no name to take them from.' },
    { name: 'srcSet', type: 'string', required: false, description: 'Higher-density versions of the photo, for sharp rendering on high-density screens.' },
    { name: 'decorative', type: 'boolean', default: false, required: false, description: 'Set it when the name is already visible beside the avatar, as in a list row or a comment header. The avatar is then hidden from assistive technology, so the name is not read twice.' },
    { name: 'shape', type: "enum: 'circular' | 'square'", values: ['circular', 'square'], default: 'circular', required: false, description: 'circular = a person. square = a team, an organization or an app. The shape also picks the glyph shown when there is no photo and no name.' },
    { name: 'size', type: "enum: 'x-small' | 'small' | 'medium' | 'large' | 'x-large'", values: ['x-small', 'small', 'medium', 'large', 'x-large'], default: 'medium', required: false, description: 'x-small = 20px, for dense lists and inline mentions. small = 24px, the size of a medium icon. medium = 32px, the default. large = 40px. x-large = 64px, for a profile header. Below medium the initials are one letter.' },
    { name: 'presence', type: "enum: 'online' | 'away' | 'busy' | 'offline'", values: ['online', 'away', 'busy', 'offline'], required: false, description: 'Shows a status dot on the bottom corner, in the badge tone for the status: online = success, away = warning, busy = danger, offline = neutral. Absent, there is no dot. The status is also added to the accessible name, so color is never the only signal.' },
    { name: 'getInitials', type: 'function', required: false, description: 'Replaces the default initials rule, for names it does not fit. The default takes the first letters of the first and last words, uppercased, one letter for a one-word name, the part before the at sign of an email address, and one character for a Chinese, Japanese or Korean name.' },
    { name: 'fallbackDelay', type: 'number', required: false, description: 'How long to wait before showing the initials while the photo loads, so a fast photo does not flash the initials first.' },
  ],

  // `[]` — a display avatar has no interaction of its own. One that opens a menu is a Button or IconButton holding an
  // avatar, and takes their states. The fallback chain is content, not interaction state: the `type` axis.
  states: [],

  variants: {
    size: [...SIZES],
    shape: ['circular', 'square'],
    // The fallback chain as it reads in Figma. Initials lead: the member Figma inserts shows a name, the common case
    // when no photo is at hand. No code prop drives it: in code the chain follows `src` and `name` at run time.
    type: ['initials', 'icon', 'image'],
  },
  // `type` is RUNTIME: a photo that fails to load swaps for the initials in place, so the box must not move. `size` and
  // `shape` are picked when the avatar is placed.
  axisKinds: { size: 'authoring', shape: 'authoring', type: 'runtime' },

  // Constant per slot: no axis changes the paint. The backdrop, the initials, the glyph and the presence ring.
  paintKeys: ['{slot}'],

  tokens: {
    // ── PAINT ────────────────────────────────────────────────────────────────────────────────────
    // One neutral backdrop for every avatar (OD-A5 A), behind the initials, the glyph and a transparent photo.
    fill: 'color.background.tertiary',
    // The initials, held to 4.5:1 on `fill` in every mode (`test.ts`).
    label: 'color.text.primary',
    // The glyph: decorative, the name carries the meaning.
    icon: 'color.icon.secondary',
    // The presence ring: the page color, so the dot separates from a photo or the backdrop. Through the box's
    // `overlay` slot, since the mask holds `fill` and two surfaces may not claim one slot (#933).
    overlay: 'color.background.primary',

    // ── THE BOX: the icon ladder at four sizes, and the one minted step at x-large (OD-A3 A) ─────────
    'size.x-small.box': 'icon.size.sm',
    'size.small.box': 'icon.size.md',
    'size.medium.box': 'icon.size.lg',
    'size.large.box': 'icon.size.xl',
    'size.x-large.box': 'icon.size.2xl',

    // ── THE CORNER: round for a person; for a square, the small radius below medium, so a 20px square does not read
    // as a circle, and the medium radius from medium up (OD-A2 A).
    'circular.x-small.radius': 'radius.round',
    'circular.small.radius': 'radius.round',
    'circular.medium.radius': 'radius.round',
    'circular.large.radius': 'radius.round',
    'circular.x-large.radius': 'radius.round',
    'square.x-small.radius': 'radius.sm',
    'square.small.radius': 'radius.sm',
    'square.medium.radius': 'radius.md',
    'square.large.radius': 'radius.md',
    'square.x-large.radius': 'radius.md',

    // ── THE INITIALS: the nearest existing label rung per size (OD-A4 A), at the emphasis weight.
    'size.x-small.initials-type': 'type.label.sm.emphasis',
    'size.small.initials-type': 'type.label.sm.emphasis',
    'size.medium.initials-type': 'type.label.sm.emphasis',
    'size.large.initials-type': 'type.label.md.emphasis',
    'size.x-large.initials-type': 'type.label.lg.emphasis',

    // ── THE GLYPH: an icon rung about two thirds of the box, the person's ink filling the circle's middle. Keyed
    // `glyph.<size>`, not `size.<size>.glyph`: `lint-rung-names.ts` reads one tier family per ref, and the box already
    // walks `icon.size.*`, so a second job on the same ladder would read as one size reaching two rungs (#4314).
    'glyph.x-small': 'icon.size.xs',
    'glyph.small': 'icon.size.xs',
    'glyph.medium': 'icon.size.sm',
    'glyph.large': 'icon.size.md',
    'glyph.x-large': 'icon.size.xl',

    // ── THE PRESENCE RING: 2px of page color around the dot, round, pinned flush into the container's corner. The
    // container has no stroke, so a 0 inset clears its edge (`lint-absolute-inset.ts`, corner arm).
    'presence-ring': 'space.025',
    'presence-ring.radius': 'radius.round',
    'presence-inset': 'space.0',
  },

  anatomy: {
    root: 'container',
    parts: {
      container: {
        kind: 'box',
        role: 'target',
        size: 'size.{size}.box',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        children: ['mask', 'presenceRing'],
        // RTL: the presence dot is anchored to the bottom inline-end corner, so it moves to the bottom left.
        mirror: 'reverses',
        note: 'The bounding square. It sets the size and clips nothing, so the presence dot can sit on its corner and overhang the picture.',
      },
      mask: {
        kind: 'box',
        role: 'presentation',
        size: 'size.{size}.box',
        radius: '{shape}.{size}.radius',
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'fixed', y: 'fixed' } },
        clipsContent: true,
        paintSlots: ['fill'],
        children: ['initials', 'personGlyph', 'organizationGlyph'],
        note: 'The shape: a circle or a rounded square that clips what it holds. Its neutral fill sits behind the initials, the glyph or a photo. Drop a photo onto it as an image fill.',
      },
      initials: {
        kind: 'text',
        type: 'size.{size}.initials-type',
        paintSlot: 'label',
        presentWhen: { type: ['initials'] },
        note: 'One or two letters from the name, centered, in the primary text color. One letter below medium.',
      },
      personGlyph: {
        kind: 'vector',
        glyph: 'person',
        // RTL: a person and a building are drawn as they are in every script.
        mirror: 'never',
        size: 'glyph.{size}',
        paintSlot: 'icon',
        presentWhen: { type: ['icon'], shape: ['circular'] },
        note: 'A generic person, shown in a circle when there is no photo and no name. Decorative.',
      },
      organizationGlyph: {
        kind: 'vector',
        glyph: 'organization',
        // RTL: a person and a building are drawn as they are in every script.
        mirror: 'never',
        size: 'glyph.{size}',
        paintSlot: 'icon',
        presentWhen: { type: ['icon'], shape: ['square'] },
        note: 'A generic building, shown in a square when there is no photo and no name. Decorative.',
      },
      presenceRing: {
        kind: 'box',
        role: 'presentation',
        optional: true,
        corner: 'bottom-right',
        inset: 'presence-inset',
        radius: 'presence-ring.radius',
        padding: { block: 'presence-ring', inlineLabel: 'presence-ring' },
        layout: { direction: 'row', align: 'center', justify: 'center', sizing: { x: 'hug', y: 'hug' } },
        paintSlots: ['overlay'],
        children: ['presenceDot'],
        note: 'A ring in the page color around the presence dot, on the bottom corner outside the picture, so the dot reads over a photo.',
      },
      presenceDot: {
        kind: 'nest',
        role: 'presentation',
        nests: 'badge',
        nesting: {
          kind: 'nest-exposed',
          variant: { type: 'dot', style: 'contained', size: 'medium', emphasis: 'bold', tone: 'success' },
          expose: ['tone'],
        },
        note: 'A badge dot. Its tone is the presence color, picked on the instance: online = success, away = warning, busy = danger, offline = neutral.',
      },
    },
    codeOnly: [
      {
        class: 'runtime-behavior',
        disposition: 'unsupported',
        description:
          'the fallback chain — in code it follows `src` and `name` at run time (a photo, then the initials, then the glyph), so the Figma axis that shows it has no prop behind it. It is the chain as a designer sees it in a file.',
      },
      {
        class: 'runtime-behavior',
        disposition: 'unsupported',
        description:
          'the image-failure path — render the native <img> with its src at once, so a cached photo paints with the HTML; draw the fallback underneath; switch on the native error event, and check img.complete on mount to catch a photo that loaded before the handler attached. Not a script that loads a virtual image first, which flashes the fallback on server-rendered and cached pages. fallbackDelay holds the initials back while a photo loads; its value waits on the motion timing work (#3486).',
      },
      {
        class: 'static-placeholder',
        disposition: 'lowered',
        description:
          'the loading placeholder — a circle or square Skeleton at the avatar size until the photo loads, then a short fade. Figma has no loading member; the image member is the mask with nothing in it, and a designer drops a photo on as an image fill.',
      },
      {
        class: 'localization',
        disposition: 'unsupported',
        description:
          'the initials rule — first letters of the first and last words, uppercased; one letter for a one-word name; from an email address, the part before the @; one character for a Chinese, Japanese or Korean name; one letter at x-small and small. getInitials replaces the rule for a locale it does not fit. The Figma text is whatever the designer types ("JD" by default), at every size.',
      },
      {
        class: 'semantics',
        disposition: 'refused',
        description:
          'the accessible-name wiring — informative: the photo\'s alt, or aria-label on the container for the initials and the glyph, is the name ("Jane Doe"), never "Avatar of Jane Doe" and never the initials. decorative: alt="" and aria-hidden="true" on the container. Presence joins the name ("Jane Doe, online") and the dot is aria-hidden. The name is the name as shown: if the interface shows "Jane D.", so does the name.',
      },
      {
        class: 'right-to-left',
        disposition: 'carried',
        description:
          'RTL — the presence dot is placed with logical properties, at the bottom inline-end corner (inset-inline-end), so it moves to the bottom left in a right-to-left layout. The photo, the initials and the glyph never mirror. Figma draws left to right, so the member pins the bottom right.',
      },
      {
        class: 'responsive-layout',
        disposition: 'unsupported',
        description:
          'the presence placement — the dot sits in a wrapper that owns the stacking context, outside the clipped mask, and a circular avatar pulls it in toward the curve (Badge\'s circular overlap). The ring is a 2px box-shadow in the page color.',
      },
    ],
  },

  figmaProperties: {
    variantAxes: ['size', 'shape', 'type'],
    gridAxis: 'size',
    // Figma-only text (no code prop: code derives the initials from `name`). One default at every size.
    texts: { initials: { part: 'initials', default: 'JD', figmaName: 'initials', figmaOnly: true } },
    swaps: {},
    // Figma-only (the code prop `presence` is an enum, and a dot shows whenever it is set): shows the ring and its dot.
    booleans: { showPresence: { part: 'presenceRing', default: false, figmaName: 'presence', figmaOnly: true } },
  },

  accessibility: {
    role: 'img, with the name as its accessible name, when the avatar is the only sign of who it is. None, hidden from assistive technology, when the name is visible beside it.',
    wcag: [
      '1.1.1 Non-text Content (the name is the text alternative, and an empty alternative when the avatar is decorative)',
      '1.4.1 Use of Color, as intent (presence is in the accessible name as a word, so the dot color is never the only signal)',
      '1.4.3 Contrast (the initials, `color.text.primary` on `color.background.tertiary`, clear 4.5:1 in every mode of the example brands, as measured)',
      '1.4.11 Non-text Contrast, as intent (the presence dot is Badge\'s, separated from the picture by a ring in the page color)',
      '4.1.2 Name, Role, Value (an informative avatar exposes the name; a decorative one exposes nothing)',
    ],
    keyboard: 'None. An avatar takes no focus and has no action. An avatar that opens a menu is inside a button, which carries the keyboard behavior.',
    focus: 'Never focusable. A button holding an avatar carries the focus ring.',
    aria: 'Informative, when the avatar is the only sign of who it is: give the photo an alt, or the container an aria-label for the initials and the glyph, that is the name, "Jane Doe", never "Avatar of Jane Doe" and never the initials. Decorative, when the name is visible beside it: alt="" and aria-hidden="true", so the name is read once. The name stays the same when the photo fails to load. With presence, the status joins the name, "Jane Doe, online", and the dot is aria-hidden. Use the name as the interface shows it: when the screen shows "Jane D.", the name is "Jane D.", never more of the record. The name is translatable; nothing in the avatar mirrors except the dot\'s corner.',
  },

  content: {
    labelPattern: 'The name as the interface shows it: "Jane Doe", "Design team". The initials come from it: J and D, or J alone below medium. For presence, a word after a comma in the name: "Jane Doe, online".',
  },

  docs: {
    usage: 'Use an avatar to show who something belongs to: the author of a comment, the person in a list row, the owner of a card, the signed-in user. Use the circle for a person and the square for a team, an organization or an app. Pick the size from the density around it: x-small or small in a dense list or an inline mention, medium by default, x-large in a profile header. Mark it decorative when the name is visible beside it. Add presence only where status matters to the task, such as a chat or a team list. Drop a photo onto the image member as an image fill, and set the initials on the initials member.',
    do: [
      'Pass the name as the interface shows it, so the initials and the accessible name both come from it',
      'Mark the avatar decorative when its name is already visible beside it',
      'Keep the circle for people and the square for teams, organizations and apps',
      'Put presence into the accessible name, as in "Jane Doe, online"',
      'Use one initial at x-small and small, and two from medium up',
    ],
    dont: [
      'Name it "Avatar of Jane Doe" or by its initials. The name is the name',
      'Make the avatar itself clickable. Put it in a button or an icon button',
      'Use an avatar for a concept or an action, such as a profile link. That is an icon',
      'Use color as the only way to tell people apart, or the dot as the only sign of presence',
      'Show the full name or email from the record when the interface shows less',
    ],
    contentGuidelines: 'Write the name the way the interface writes it next to the avatar, with the same shortening. Initials are uppercase, at most two letters, and one letter below medium. For an email address, the initials come from the part before the at sign. For presence, use the plain word for the state: online, away, busy, offline.',
  },

  ai: {
    primaryPurpose: 'Show which person or organization something belongs to, as a photo, initials or a generic glyph.',
    whenToUse: 'A specific person or organization needs a picture: a comment author, a list row, a card owner, the signed-in user in a header, a team or app in a switcher. Add presence when the task depends on whether the person is available.',
    avoidWhen: 'The picture stands for an action or a concept rather than a specific person, such as a profile link or a settings icon (use Icon), the picture is content media with no identity (use ImagePlaceholder), or the avatar is a control that opens something (put it in a Button or an IconButton).',
    commonPartners: ['badge', 'button', 'icon-button', 'list-item', 'tag'],
    triggerKeywords: ['avatar', 'user avatar', 'profile picture', 'profile photo', 'user picture', 'initials', 'presence', 'online status', 'team avatar', 'organization avatar'],
    generationPriority: 3,
  },

  composition: {
    composesWith: ['badge'],
    alternativeTo: ['icon', 'image-placeholder'],
    planned: ['avatar-group', 'skeleton', 'card', 'image'],
    replacesPatterns: [
      'a circular image with no fallback, which shows a broken image when the photo fails to load',
      'an avatar labeled "Avatar of" a name, or named by its initials',
    ],
  },

  motion: {
    enter: 'The photo fades in over the backdrop or the loading placeholder on motion.duration.fast with motion.easing-role.enter. The box is reserved, so nothing moves.',
    exit: 'None. A photo that fails to load is replaced by the initials at once.',
    reduceMotion: 'Under prefers-reduced-motion the photo appears with no fade. The picture is the information, not the motion.',
  },

  notes: {
    contested: [],
    unverified: [
      'The presence ring at the bounding square\'s corner sits partly over the circle\'s edge at x-small and clear of it at x-large; the code pulls it in toward the curve. The Figma placement has not been checked on a live host.',
      'The KB brief was not read directly by the build lane (no access to the knowledge-base repository in this session); the brief\'s positions here come from the proposal\'s paraphrase of it (#4110).',
    ],
    evolution: [
      'Built from the proposal (#4110) with every owner decision at its recommendation (OD-A1 to OD-A8, all A, 2026-11-19): Avatar only, circle and square, five sizes on the icon ladder plus one minted 64px step, one initial below medium, one neutral backdrop, person and organization glyphs, a nested Badge dot for presence, and a required name with a decorative flag.',
      'Owner decisions on the PR (2026-11-20): the x-large token is `icon.size.2xl` (OD-A3.1 A); the shape values align on Icon button\'s words, `circular | square`, one convention across the library; presence maps online = success, away = warning, busy = danger, offline = neutral; the x-large initials stay on `type.label.lg`; the glyph sizes stay as built (`icon.size.xs`, `xs`, `sm`, `md`, `xl`).',
      'Owner decision (2026-11-20): the Figma text is one default, "JD", at every size, since a set-level text property holds one default; the one-letter rule at x-small and small is applied in code. Avatar has its own page under Components, beside Badge. The person and organization glyphs are approved as drawn, on the 24px grid. The presence-dot, badge-dot and shape descriptions are approved as written.',
      'The corner pin (`PartDef.corner`), first a glyph-only placement for the textarea grip, takes a box too, for the presence ring. Both executors already placed the pinned node by name, whatever its type.',
    ],
  },
};
