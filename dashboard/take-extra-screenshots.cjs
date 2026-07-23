const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const srcDir = path.join(__dirname, 'screenshots-src');
const outputDir = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const pages = [
  { name: '07-data-flow-diagram.png',     file: '07-data-flow-diagram.html',     wait: 500,  fullPage: true  },
  { name: '08-wokwi-setup.png',           file: '08-wokwi-setup.html',           wait: 500,  fullPage: true  },
  { name: '09-mqtt-messages.png',         file: '09-mqtt-messages.html',         wait: 500,  fullPage: true  },
  { name: '10-backend-api-schema.png',    file: '10-backend-schema.html',        wait: 500,  fullPage: false },
  { name: '11-api-json-response.png',     file: '11-api-json-response.html',     wait: 500,  fullPage: false },
  { name: '12-historical-charts.png',     file: '12-historical-charts.html',     wait: 2000, fullPage: true  },
  { name: '13-alerts-triggered.png',      file: '13-alerts-triggered.html',      wait: 500,  fullPage: true  },
  { name: '14-devtools-auth-header.png',   file: '14-devtools-auth.html',         wait: 500,  fullPage: false },
  { name: '15-deployment-success.png',     file: '15-deployment-success.html',   wait: 500,  fullPage: true  },
];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--window-size=1400,900']
  });
  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await page.goto('file://' + path.join(srcDir, p.file), { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, p.wait));
    await page.screenshot({ path: path.join(outputDir, p.name), fullPage: p.fullPage });
    console.log(`Captured ${p.name}`);
    await page.close();
  }
  await browser.close();
  console.log('All 9 screenshots captured');
})();
