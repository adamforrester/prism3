/**
 * THE BROWSER SUITES' GOOGLE FONTS STAND-IN (#3138).
 *
 * The web studio and the "Prism3 Studio" plugin ask Google Fonts for a brand face this device lacks (`ui/web-fonts.ts`).
 * A suite must not reach Google: a run would draw different faces with and without the runner's network, and a request
 * that fails logs a console error, which every section's "0 console errors" arm counts. So each browser this returns
 * answers every request to the two Google Fonts hosts with an empty stylesheet, silently: the loader reads it as "not on
 * Google Fonts" and the line keeps its labeled fallback, exactly as offline. A section that tests the loader serves its
 * own fixture with `page.route`, which Playwright tries before this context-level route.
 */
const GOOGLE_FONTS = /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\//;
const answer = (route) => route.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: '' });

/** `chromium.launch(opts)`, with every context and page it makes answering the Google Fonts hosts with nothing. */
export const launchWithoutWebFonts = async (chromium, opts) => {
  const browser = await chromium.launch(opts);
  const newContext = browser.newContext.bind(browser);
  const newPage = browser.newPage.bind(browser);
  browser.newContext = async (...a) => { const ctx = await newContext(...a); await ctx.route(GOOGLE_FONTS, answer); return ctx; };
  browser.newPage = async (...a) => { const page = await newPage(...a); await page.route(GOOGLE_FONTS, answer); return page; };
  return browser;
};
