# Avatar

> A person or organization, shown as a photo, initials or a generic glyph, in that order.

- **ID:** `avatar`
- **Category:** foundations
- **Status:** draft
- **Also known as:** user-avatar, profile-picture, profile-image, avatar-image

## Overview

The picture of a specific person or organization. It shows a photo when there is one, the initials of the name when there is not, and a generic glyph when there is no name either: a person in a circle, an organization in a square. The circle is for a person and the square for a team, an organization or an app. Five sizes, from 20px in a dense list to 64px in a profile header. An optional presence dot sits on the bottom corner, outside the picture, so it is never cut off. An avatar is not interactive: one that opens a menu is a button holding an avatar.

- **Purpose:** Show which person or organization something belongs to, as a photo, initials or a generic glyph.
- **Use when:** A specific person or organization needs a picture: a comment author, a list row, a card owner, the signed-in user in a header, a team or app in a switcher. Add presence when the task depends on whether the person is available.
- **Avoid when:** The picture stands for an action or a concept rather than a specific person, such as a profile link or a settings icon (use Icon), the picture is content media with no identity (use ImagePlaceholder), or the avatar is a control that opens something (put it in a Button or an IconButton).

## Anatomy

Shown on the default member: size `medium`, shape `circular`, type `initials`.

1. **Container** — The bounding square. It sets the size and clips nothing, so the presence dot can sit on its corner and overhang the picture.
2. **Mask** — The shape: a circle or a rounded square that clips what it holds. Its neutral fill sits behind the initials, the glyph or a photo. Drop a photo onto it as an image fill.
3. **Initials** — One or two letters from the name, centered, in the primary text color. One letter below medium.
4. **Person glyph** — A generic person, shown in a circle when there is no photo and no name. Decorative.
5. **Organization glyph** — A generic building, shown in a square when there is no photo and no name. Decorative.
6. **Presence ring** (optional) — A ring in the page color around the presence dot, on the bottom corner outside the picture, so the dot reads over a photo.
7. **Presence dot** — A badge dot. Its tone is the presence color, picked on the instance: online = success, away = warning, busy = danger, offline = neutral.

## Styles

| Axis | Values | Changes | Description |
| --- | --- | --- | --- |
| `size` | `medium`, `x-small`, `small`, `large`, `x-large` | once, when authored | x-small = 20px, for dense lists and inline mentions. small = 24px, the size of a medium icon. medium = 32px, the default. large = 40px. x-large = 64px, for a profile header. Below medium the initials are one letter. |
| `shape` | `circular`, `square` | once, when authored | circular = a person. square = a team, an organization or an app. The shape also picks the glyph shown when there is no photo and no name. |
| `type` | `initials`, `icon`, `image` | at runtime | — |

## Usage guidelines

Use an avatar to show who something belongs to: the author of a comment, the person in a list row, the owner of a card, the signed-in user. Use the circle for a person and the square for a team, an organization or an app. Pick the size from the density around it: x-small or small in a dense list or an inline mention, medium by default, x-large in a profile header. Mark it decorative when the name is visible beside it. Add presence only where status matters to the task, such as a chat or a team list. Drop a photo onto the image member as an image fill, and set the initials on the initials member.

**In RTL.** The layout mirrors: the start edge is on the right. The person and organization glyphs do not mirror.

### Do

- Pass the name as the interface shows it, so the initials and the accessible name both come from it
- Mark the avatar decorative when its name is already visible beside it
- Keep the circle for people and the square for teams, organizations and apps
- Put presence into the accessible name, as in "Jane Doe, online"
- Use one initial at x-small and small, and two from medium up

### Don't

- Name it "Avatar of Jane Doe" or by its initials. The name is the name
- Make the avatar itself clickable. Put it in a button or an icon button
- Use an avatar for a concept or an action, such as a profile link. That is an icon
- Use color as the only way to tell people apart, or the dot as the only sign of presence
- Show the full name or email from the record when the interface shows less

## Accessibility

- **Keyboard:** None. An avatar takes no focus and has no action. An avatar that opens a menu is inside a button, which carries the keyboard behavior.
- **Focus:** Never focusable. A button holding an avatar carries the focus ring.
- **Screen readers:** img, with the name as its accessible name, when the avatar is the only sign of who it is. None, hidden from assistive technology, when the name is visible beside it.

  Informative, when the avatar is the only sign of who it is: give the photo an alt, or the container an aria-label for the initials and the glyph, that is the name, "Jane Doe", never "Avatar of Jane Doe" and never the initials. Decorative, when the name is visible beside it: alt="" and aria-hidden="true", so the name is read once. The name stays the same when the photo fails to load. With presence, the status joins the name, "Jane Doe, online", and the dot is aria-hidden. Use the name as the interface shows it: when the screen shows "Jane D.", the name is "Jane D.", never more of the record. The name is translatable; nothing in the avatar mirrors except the dot's corner.

### WCAG

- 1.1.1 Non-text Content (the name is the text alternative, and an empty alternative when the avatar is decorative)
- 1.4.1 Use of Color, as intent (presence is in the accessible name as a word, so the dot color is never the only signal)
- 1.4.3 Contrast (the initials, `color.text.primary` on `color.background.tertiary`, clear 4.5:1 in every mode of the example brands, as measured)
- 1.4.11 Non-text Contrast, as intent (the presence dot is Badge's, separated from the picture by a ring in the page color)
- 4.1.2 Name, Role, Value (an informative avatar exposes the name; a decorative one exposes nothing)

### Motion

- **Enter:** The photo fades in over the backdrop or the loading placeholder on motion.duration.fast with motion.easing-role.enter. The box is reserved, so nothing moves.
- **Exit:** None. A photo that fails to load is replaced by the initials at once.
- **Reduced motion:** Under prefers-reduced-motion the photo appears with no fade. The picture is the information, not the motion.

## Content guidelines

Write the name the way the interface writes it next to the avatar, with the same shortening. Initials are uppercase, at most two letters, and one letter below medium. For an email address, the initials come from the part before the at sign. For presence, use the plain word for the state: online, away, busy, offline.

- **Labels:** The name as the interface shows it: "Jane Doe", "Design team". The initials come from it: J and D, or J alone below medium. For presence, a word after a comma in the name: "Jane Doe, online".

## Related components

- **Built from:** `badge`
- **Instead, consider:** `icon`, `image-placeholder`
- **Often used with:** `button`, `icon-button`, `list-item`, `tag`, `skeleton`
- **Replaces:**
  - a circular image with no fallback, which shows a broken image when the photo fails to load
  - an avatar labeled "Avatar of" a name, or named by its initials

## Building it in code

### Props

| Name | Type | Default | Required | Description |
| --- | --- | --- | --- | --- |
| `name` | string | — | yes | The person or organization the avatar shows, exactly as the interface writes it next to the avatar. It is the accessible name and the source of the initials, so it stays the same when the photo fails to load. |
| `src` | string | — | no | The photo. When it is missing or fails to load, the avatar shows the initials, or the glyph when there is no name to take them from. |
| `srcSet` | string | — | no | Higher-density versions of the photo, for sharp rendering on high-density screens. |
| `decorative` | boolean | `false` | no | Set it when the name is already visible beside the avatar, as in a list row or a comment header. The avatar is then hidden from assistive technology, so the name is not read twice. |
| `shape` | enum: 'circular' \| 'square' | `circular` | no | circular = a person. square = a team, an organization or an app. The shape also picks the glyph shown when there is no photo and no name. |
| `size` | enum: 'x-small' \| 'small' \| 'medium' \| 'large' \| 'x-large' | `medium` | no | x-small = 20px, for dense lists and inline mentions. small = 24px, the size of a medium icon. medium = 32px, the default. large = 40px. x-large = 64px, for a profile header. Below medium the initials are one letter. |
| `presence` | enum: 'online' \| 'away' \| 'busy' \| 'offline' | — | no | Shows a status dot on the bottom corner, in the badge tone for the status: online = success, away = warning, busy = danger, offline = neutral. Absent, there is no dot. The status is also added to the accessible name, so color is never the only signal. |
| `getInitials` | function | — | no | Replaces the default initials rule, for names it does not fit. The default takes the first letters of the first and last words, uppercased, one letter for a one-word name, the part before the at sign of an email address, and one character for a Chinese, Japanese or Korean name. |
| `fallbackDelay` | number | — | no | How long to wait before showing the initials while the photo loads, so a fast photo does not flash the initials first. |

## Specs

Generated from the plan that builds the design-file component: 30 members. Values are token names; a px value appears only where the build writes a number.

### Anatomy

| Part | Kind | In |
| --- | --- | --- |
| `container` | frame | every member |
| `container/mask` | frame | every member |
| `container/mask/initials` | text | type=initials |
| `container/presenceRing` | frame | every member |
| `container/presenceRing/presenceDot` | instance | every member |
| `container/mask/personGlyph` | instance | 5 of 30 members |
| `container/mask/organizationGlyph` | instance | 5 of 30 members |

### Spacing and size

Padding reads top / right / bottom / left when its sides differ.

Keyed by `size`, `shape`.

**size=medium, shape=circular**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.lg` | `icon.size.lg` | — | — |
| `container/mask` | — | — | `icon.size.lg` | `icon.size.lg` | — | radius `radius.round` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/personGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=x-small, shape=circular**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/mask` | — | — | `icon.size.sm` | `icon.size.sm` | — | radius `radius.round` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/personGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, shape=circular**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/mask` | — | — | `icon.size.md` | `icon.size.md` | — | radius `radius.round` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/personGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, shape=circular**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.xl` | `icon.size.xl` | — | — |
| `container/mask` | — | — | `icon.size.xl` | `icon.size.xl` | — | radius `radius.round` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/personGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=x-large, shape=circular**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.2xl` | `icon.size.2xl` | — | — |
| `container/mask` | — | — | `icon.size.2xl` | `icon.size.2xl` | — | radius `radius.round` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/personGlyph` | — | — | `icon.size.xl` | `icon.size.xl` | — | — |

**size=medium, shape=square**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.lg` | `icon.size.lg` | — | — |
| `container/mask` | — | — | `icon.size.lg` | `icon.size.lg` | — | radius `radius.md` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/organizationGlyph` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |

**size=x-small, shape=square**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.sm` | `icon.size.sm` | — | — |
| `container/mask` | — | — | `icon.size.sm` | `icon.size.sm` | — | radius `radius.sm` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/organizationGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=small, shape=square**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.md` | `icon.size.md` | — | — |
| `container/mask` | — | — | `icon.size.md` | `icon.size.md` | — | radius `radius.sm` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/organizationGlyph` | — | — | `icon.size.xs` | `icon.size.xs` | — | — |

**size=large, shape=square**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.xl` | `icon.size.xl` | — | — |
| `container/mask` | — | — | `icon.size.xl` | `icon.size.xl` | — | radius `radius.md` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/organizationGlyph` | — | — | `icon.size.md` | `icon.size.md` | — | — |

**size=x-large, shape=square**

| Part | Padding | Gap | Height | Width | Min width | Other |
| --- | --- | --- | --- | --- | --- | --- |
| `container` | — | — | `icon.size.2xl` | `icon.size.2xl` | — | — |
| `container/mask` | — | — | `icon.size.2xl` | `icon.size.2xl` | — | radius `radius.md` |
| `container/presenceRing` | `space.025` | — | — | — | — | radius `radius.round` |
| `container/mask/organizationGlyph` | — | — | `icon.size.xl` | `icon.size.xl` | — | — |

### Type

Keyed by `size`.

| Members | Part | Text style |
| --- | --- | --- |
| size=medium | `container/mask/initials` | `type.label.sm.emphasis` |
| size=x-small | `container/mask/initials` | `type.label.sm.emphasis` |
| size=small | `container/mask/initials` | `type.label.sm.emphasis` |
| size=large | `container/mask/initials` | `type.label.md.emphasis` |
| size=x-large | `container/mask/initials` | `type.label.lg.emphasis` |

### Color

Keyed by `shape`, `type`.

**shape=circular, type=initials**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/mask/initials` | — | — | `color.text.primary` | — |
| `container/presenceRing` | `color.background.primary` | — | — | — |

**shape=circular, type=icon**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/mask/personGlyph` | — | — | — | `color.icon.secondary` |
| `container/presenceRing` | `color.background.primary` | — | — | — |

**shape=circular, type=image**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/presenceRing` | `color.background.primary` | — | — | — |

**shape=square, type=initials**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/mask/initials` | — | — | `color.text.primary` | — |
| `container/presenceRing` | `color.background.primary` | — | — | — |

**shape=square, type=icon**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/mask/organizationGlyph` | — | — | — | `color.icon.secondary` |
| `container/presenceRing` | `color.background.primary` | — | — | — |

**shape=square, type=image**

| Part | Fill | Stroke | Ink | Icon |
| --- | --- | --- | --- | --- |
| `container/mask` | `color.background.tertiary` | — | — | — |
| `container/presenceRing` | `color.background.primary` | — | — | — |

### Nesting and properties

- `container/presenceRing/presenceDot` nests `badge` at `type=dot, style=contained, size=medium, emphasis=bold, tone=success`; exposes `tone`
- `container/mask/personGlyph` nests `icon/person`
- `container/mask/organizationGlyph` nests `icon/organization`

| Property | Type | Default |
| --- | --- | --- |
| `initials` | text | `JD` |
| `presence` | boolean | `false` |

---

Generated from the `avatar` component definition.
