# @prism3/storybook

The arm 1 Storybook for the code POC (#3408). This is S5 thin: owner decision Q-POC1 A pulled it forward so arm 1
reaches parity with arm 2 sooner. It runs Storybook 10 on `@storybook/web-components-vite`.

Each component has two story files, one per delivery form, with the same stories in each:

- **Element:** the custom element from `@prism3/web-components` (`<p3-button>`, `<p3-text-field>`,
  `<p3-password-field>`). Its controls come from `custom-elements.json`.
- **HTML:** plain HTML and CSS, written to `@prism3/css`'s README markup contract. The password field also loads
  `@prism3/css/password-field.js`, its Show/Hide script; nothing else runs a script.

**Button:** one story per state the def lists (rest, hover, pressed, focus-visible, disabled, inactive and
pending), then each appearance, each size, the inverse surface, the visual slots and full width.

**Text field and password field:** rest, filled, hover, focus-visible, each validation status (error, warning,
success), disabled, read-only, pending, required, each size and the visual slots. The password field adds `Shown`
and `ShownError`, which press Show. Their cases live in `stories/fields.js`, shared by both fields and both forms.

Hover, pressed and focus-visible are forced through `storybook-addon-pseudo-states`. The toolbar switches the theme
between light and dark.

```sh
npm run -w @prism3/storybook dev     # http://localhost:6006
npm run -w @prism3/storybook build   # storybook-static/, never committed
npx tsx apps/storybook/check-build.ts
```

Both scripts build the token CSS from `@prism3/tokens` first.

## Adding a component

1. Add the component's cases (`stories/<component>/cases.js`, or a shared module as the fields use), plus one
   `*.element.stories.js` and one `*.html.stories.js` that export a story per case.
2. Import the component's stylesheet in `.storybook/preview.js`, and its element module if the package's root entry
   doesn't register it (today the root registers `<p3-button>` only).
3. Add the component, its two forms and its cases to `EXPECTED` in `check-build.ts`.

## Not here yet

`addon-a11y` (axe), `addon-vitest` and the keyboard tests come with S5 proper.

## Check

`check-build.ts` serves `storybook-static/` and opens every story in Chromium. It checks four things:

- The index holds exactly the stories its own `EXPECTED` list names.
- Each story renders its component.
- Each forced state shows: hover and pressed change the fill, and focus-visible draws the ring. For the fields,
  hover and focus-visible change the box, each validation status draws its own border and glyph, and Show unmasks.
- **The fields' error wiring (owner decision #1712 A):** the label names the input; `aria-describedby` names the
  field's message; `aria-invalid="true"` is on the input at error only; and no field holds a live region.
- The element and HTML stories of one case compute the same styles.
