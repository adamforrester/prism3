import { chromium } from '/home/user/prism3/node_modules/playwright/index.mjs';
const [dir, ...brands] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' + '' }).catch(() => chromium.launch());
const p = await b.newPage({ viewport: { width: 1180, height: 800 }, deviceScaleFactor: 2 });
for (const br of brands) { await p.goto('file://' + dir + '/' + br + '.html'); await p.screenshot({ path: dir + '/' + br + '.png', fullPage: true }); }
await b.close(); console.log('shot');
