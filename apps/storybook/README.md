# @prism3/storybook

The arm 1 Storybook for the code POC (#3408). This is S5 thin: owner decision Q-POC1 A pulled it forward so arm 1
reaches parity with arm 2 sooner. It runs Storybook 10 on `@storybook/web-components-vite`.

Each component has two story files, one per delivery form, with the same stories in each:

- **Element:** the custom element from `@prism3/web-components` (`<p3-button>`). Its controls come from
  `custom-elements.json`.
- **HTML:** plain HTML and CSS, written to `@prism3/css`'s README markup contract, with no script.

There's one story per state the def lists: rest, hover, pressed, focus-visible, disabled, inactive and pending.
Then come each appearance, each size, the inverse surface, the visual slots and full width. Hover, pressed and
focus-visible are forced through `storybook-addon-pseudo-states`. The toolbar switches the theme between light and
dark.

```sh
npm run -w @prism3/storybook dev     # http://localhost:6006
npm run -w @prism3/storybook build   # storybook-static/, never committed
npx tsx apps/storybook/check-build.ts
```

Both scripts build the token CSS from `@prism3/tokens` first.

## Adding a component

1. Add `stories/<component>/cases.js` with the component's cases, plus one `*.element.stories.js` and one
   `*.html.stories.js` that export a story per case.
2. Import the component's stylesheet in `.storybook/preview.js`.
3. Add the component, its two forms and its cases to `EXPECTED` in `check-build.ts`.

Text-field and password-field join this way once S3 lands.

## Not here yet

`addon-a11y` (axe), `addon-vitest` and the keyboard tests come with S5 proper.

## Check

`check-build.ts` serves `storybook-static/` and opens every story in Chromium. It checks four things:

- The index holds exactly the stories its own `EXPECTED` list names.
- Each story renders its component.
- Each forced state shows: hover and pressed change the fill, and focus-visible draws the ring.
- The element and HTML stories of one case compute the same styles.
