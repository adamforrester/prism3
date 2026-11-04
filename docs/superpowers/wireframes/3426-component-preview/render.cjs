// THROWAWAY (#3426 wireframe): render mock.html inside the built Studio's Components page, as a PNG.
//   node render.cjs <studio dir with dist/> <mock.html> <out.png>
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const [ROOT, MOCK, OUT] = process.argv.slice(2);
const srv = http.createServer((q, r) => { const p = path.join(ROOT, q.url === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : 'text/html' }); r.end(d); }); }).listen(0);
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1440, height: 1180 }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${srv.address().port}/index.html`, { waitUntil: 'networkidle' });
  await page.locator('[data-p3="start-example"]').filter({ hasText: 'Prism3' }).first().click();
  await page.waitForSelector('[data-p3="start-screen"]', { state: 'detached' });
  await page.click('[data-p3="rail-components"]');
  await page.waitForFunction(() => document.querySelector('[data-p3="frame"]')?.dataset.place === 'components');
  await page.evaluate(() => document.fonts.ready);
  const html = fs.readFileSync(MOCK, 'utf8');
  const found = await page.evaluate((html) => {
    // The brand's primary, from the live Button specimen, so the mock's radios wear the brand on screen.
    const btn = [...document.querySelectorAll('[data-p3="preview-pane"] button, [data-p3="preview-pane"] [role="button"], [data-p3="preview-pane"] *')].find((n) => n.textContent.trim() === 'OK');
    const primary = btn ? getComputedStyle(btn).backgroundColor : 'rgb(30,30,255)';
    const body = document.querySelector('[data-p3="preview-body"]');
    body.innerHTML = '';
    const host = document.createElement('div'); host.style.setProperty('--b-primary', primary); host.innerHTML = html;
    body.appendChild(host);
    body.scrollTop = 0;
    const radio = document.querySelector('[data-p3="radio-options-section"]');
    if (radio) radio.scrollIntoView({ block: 'start' });
    return { primary, radio: !!radio };
  }, html);
  console.log(found);
  await page.mouse.move(900, 1100);
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT });
  await b.close(); srv.close();
})();
