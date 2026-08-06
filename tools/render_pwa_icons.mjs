import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const source = await readFile('static/pirate-mark.svg', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  for (const size of [192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}svg{display:block;width:${size}px;height:${size}px}</style>${source}`);
    await page.locator('svg').screenshot({ path: `static/pirate-mark-${size}.png`, omitBackground: false });
    await page.close();
  }
} finally {
  await browser.close();
}
