/**
 * test_viewport_geometry.mjs
 * Empirical Layout Geometry and Zero-Overflow Headless Harness
 * Tests 320px, 375px, and 414px mobile viewports against real Chromium rendering engine.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SHOWCASE_DIR = path.join(REPO_ROOT, 'apps', 'showcase');

// 1. Static HTTP Server for Showcase
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(SHOWCASE_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) {
    // Check repo root for /data or /development-documents if requested
    const altPath = path.join(REPO_ROOT, urlPath);
    if (fs.existsSync(altPath)) {
      filePath = altPath;
    }
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + urlPath);
  }
});

const PORT = 4321;
await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
console.log(`Local static server running on http://127.0.0.1:${PORT}`);

// 2. Launch Headless Chromium
const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromeExe = chromePaths.find(p => fs.existsSync(p));
if (!chromeExe) {
  console.error('No suitable browser found for headless layout testing.');
  server.close();
  process.exit(1);
}

const CDP_PORT = 9333;
const browserProc = spawn(chromeExe, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--disable-extensions',
  'about:blank'
], { stdio: 'ignore' });

// Wait for CDP endpoint
async function waitForCDP(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('Timeout waiting for CDP');
}

const cdpVersion = await waitForCDP();
console.log(`Connected to headless browser: ${cdpVersion.Browser}`);

// 3. Connect via WebSocket
class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.callbacks = new Map();
    this.eventListeners = new Map();

    this.ready = new Promise(resolve => {
      this.ws.addEventListener('open', resolve);
    });

    this.ws.addEventListener('message', event => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method && this.eventListeners.has(msg.method)) {
        for (const cb of this.eventListeners.get(msg.method)) cb(msg.params);
      }
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const msgId = ++this.id;
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation exception: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

// Create new target/tab
const newTab = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/new?http://127.0.0.1:${PORT}`, { method: 'PUT' })).json();
const client = new CDPClient(newTab.webSocketDebuggerUrl);

await client.send('Page.enable');
await client.send('Runtime.enable');
await client.send('DOM.enable');

// Wait for page load
await new Promise(r => setTimeout(r, 1500));

console.log('='.repeat(80));
console.log('  HEADLESS CHROMIUM EMPIRICAL VIEWPORT GEOMETRY HARNESS');
console.log('='.repeat(80));

const VIEWPORTS = [320, 375, 414];
const report = {
  testedViewports: {},
  overflowFailures: [],
  calendarMetrics: {}
};

for (const width of VIEWPORTS) {
  console.log(`\n--- Testing Viewport Width: ${width}px (Height: 800px, Scale: 2x) ---`);

  // Emulate mobile viewport
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height: 800,
    deviceScaleFactor: 2,
    mobile: true,
    screenOrientation: { angle: 0, type: 'portraitPrimary' }
  });

  await new Promise(r => setTimeout(r, 400));

  // 1. Measure Window & Document Dimensions
  const docMetrics = await client.eval(`
    (() => {
      const html = document.documentElement;
      const body = document.body;
      return {
        windowInnerWidth: window.innerWidth,
        windowScrollX: window.scrollX,
        htmlClientWidth: html.clientWidth,
        htmlScrollWidth: html.scrollWidth,
        bodyClientWidth: body.clientWidth,
        bodyScrollWidth: body.scrollWidth,
        hasHorizontalOverflow: html.scrollWidth > window.innerWidth || body.scrollWidth > window.innerWidth
      };
    })()
  `);

  console.log(`  Window innerWidth:     ${docMetrics.windowInnerWidth}px`);
  console.log(`  HTML clientWidth:      ${docMetrics.htmlClientWidth}px | scrollWidth: ${docMetrics.htmlScrollWidth}px`);
  console.log(`  Body clientWidth:      ${docMetrics.bodyClientWidth}px | scrollWidth: ${docMetrics.bodyScrollWidth}px`);
  console.log(`  Horizontal Overflow:   ${docMetrics.hasHorizontalOverflow ? 'FAIL' : 'PASS (0px overflow)'}`);

  // 2. Scan every rendered DOM element for horizontal protrusion (> innerWidth + 0.5px)
  const overflowingElements = await client.eval(`
    (() => {
      const culprits = [];
      const vw = window.innerWidth;
      const all = document.querySelectorAll('*');
      for (const el of all) {
        // Skip hidden or unrendered elements
        if (el.offsetParent === null && el.tagName !== 'BODY' && el.tagName !== 'HTML') continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const rect = el.getBoundingClientRect();
        // If element is inside an element that handles overflow-x (like heatmap or tabs), it's permitted
        let parent = el.parentElement;
        let insideScrollable = false;
        while (parent && parent !== document.body) {
          const pStyle = window.getComputedStyle(parent);
          if (pStyle.overflowX === 'auto' || pStyle.overflowX === 'scroll' || pStyle.overflowX === 'hidden') {
            insideScrollable = true;
            break;
          }
          parent = parent.parentElement;
        }

        if (!insideScrollable && rect.right > (vw + 1.0)) {
          culprits.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || '',
            className: el.className || '',
            rectRight: Math.round(rect.right * 10) / 10,
            overflowPx: Math.round((rect.right - vw) * 10) / 10
          });
        }
      }
      return culprits;
    })()
  `);

  if (overflowingElements.length === 0) {
    console.log(`  Protrusion Scan:       PASS (0 uncontained overflowing elements)`);
  } else {
    console.error(`  Protrusion Scan:       FAIL (${overflowingElements.length} elements protrude beyond ${width}px)`);
    for (const c of overflowingElements.slice(0, 5)) {
      console.error(`    - <${c.tag} id="${c.id}" class="${c.className}"> right=${c.rectRight}px (+${c.overflowPx}px)`);
    }
  }

  // 3. Inspect Calendar Widget 1 (DIN Monthly Grid)
  const cal1Metrics = await client.eval(`
    (() => {
      // Ensure Grid tab is active
      const gridTab = document.querySelector('.calendar-tab-btn[data-view="grid"]');
      if (gridTab && !gridTab.classList.contains('active')) gridTab.click();

      const card = document.querySelector('.calendar-grid-card');
      const matrix = document.querySelector('.cal-grid-matrix');
      const nav = document.querySelector('.cal-grid-nav');
      const cell = document.querySelector('.cal-cell');
      const pill = document.querySelector('.cal-event-pill');
      const glyph = document.querySelector('.pill-glyph');
      const name = document.querySelector('.pill-name');

      return {
        cardWidth: card ? Math.round(card.getBoundingClientRect().width * 10) / 10 : 0,
        matrixWidth: matrix ? Math.round(matrix.getBoundingClientRect().width * 10) / 10 : 0,
        navWidth: nav ? Math.round(nav.getBoundingClientRect().width * 10) / 10 : 0,
        cellWidth: cell ? Math.round(cell.getBoundingClientRect().width * 10) / 10 : 0,
        pillWidth: pill ? Math.round(pill.getBoundingClientRect().width * 10) / 10 : 0,
        pillNameDisplay: name ? window.getComputedStyle(name).display : 'none',
        glyphDisplay: glyph ? window.getComputedStyle(glyph).display : 'none',
        glyphFontSize: glyph ? window.getComputedStyle(glyph).fontSize : 'none'
      };
    })()
  `);
  console.log(`  Calendar 1 (Grid):     Card=${cal1Metrics.cardWidth}px | Matrix=${cal1Metrics.matrixWidth}px | Cell=${cal1Metrics.cellWidth}px | Pill=${cal1Metrics.pillWidth}px | Glyph=${cal1Metrics.glyphFontSize} (name display: ${cal1Metrics.pillNameDisplay})`);

  // 4. Inspect Calendar Widget 2 (Timeline Agenda)
  await client.eval(`
    (() => {
      const tab = document.querySelector('.calendar-tab-btn[data-view="timeline"]');
      if (tab) tab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 200));

  const cal2Metrics = await client.eval(`
    (() => {
      const card = document.querySelector('.calendar-timeline-card');
      const bar = document.querySelector('.dual-phase-bar');
      const itemCard = document.querySelector('.timeline-item-card');
      return {
        cardWidth: card ? Math.round(card.getBoundingClientRect().width * 10) / 10 : 0,
        barWidth: bar ? Math.round(bar.getBoundingClientRect().width * 10) / 10 : 0,
        itemCardWidth: itemCard ? Math.round(itemCard.getBoundingClientRect().width * 10) / 10 : 0
      };
    })()
  `);
  console.log(`  Calendar 2 (Timeline): Card=${cal2Metrics.cardWidth}px | DualPhaseBar=${cal2Metrics.barWidth}px | ItemCard=${cal2Metrics.itemCardWidth}px`);

  // 5. Inspect Calendar Widget 3 (Risk Heatmap)
  await client.eval(`
    (() => {
      const tab = document.querySelector('.calendar-tab-btn[data-view="heatmap"]');
      if (tab) tab.click();
    })()
  `);
  await new Promise(r => setTimeout(r, 200));

  const cal3Metrics = await client.eval(`
    (() => {
      const card = document.querySelector('.calendar-heatmap-card');
      const kpis = document.querySelector('.heatmap-kpi-banner');
      const wrapper = document.querySelector('.heatmap-matrix-wrapper');
      const grid = document.querySelector('.heatmap-grid');
      return {
        cardWidth: card ? Math.round(card.getBoundingClientRect().width * 10) / 10 : 0,
        kpiBannerWidth: kpis ? Math.round(kpis.getBoundingClientRect().width * 10) / 10 : 0,
        wrapperWidth: wrapper ? Math.round(wrapper.getBoundingClientRect().width * 10) / 10 : 0,
        gridScrollWidth: grid ? grid.scrollWidth : 0,
        gridClientWidth: grid ? grid.clientWidth : 0,
        gridHasScroll: grid ? grid.scrollWidth > grid.clientWidth : false
      };
    })()
  `);
  console.log(`  Calendar 3 (Heatmap):  Card=${cal3Metrics.cardWidth}px | Wrapper=${cal3Metrics.wrapperWidth}px | Grid client=${cal3Metrics.gridClientWidth}px (scroll=${cal3Metrics.gridScrollWidth}px, internal scroll: ${cal3Metrics.gridHasScroll})`);

  // 6. Inspect Dashboard Widgets Grid
  const dashboardMetrics = await client.eval(`
    (() => {
      const widgetsGrid = document.querySelector('.widgets-grid');
      const spendRadar = document.querySelector('#spend-radar-widget');
      const gobdFeed = document.querySelector('#gobd-feed-widget');
      return {
        gridWidth: widgetsGrid ? Math.round(widgetsGrid.getBoundingClientRect().width * 10) / 10 : 0,
        spendRadarWidth: spendRadar ? Math.round(spendRadar.getBoundingClientRect().width * 10) / 10 : 0,
        gobdFeedWidth: gobdFeed ? Math.round(gobdFeed.getBoundingClientRect().width * 10) / 10 : 0
      };
    })()
  `);
  console.log(`  Dashboard Widgets:     Grid=${dashboardMetrics.gridWidth}px | Radar=${dashboardMetrics.spendRadarWidth}px | GoBDFeed=${dashboardMetrics.gobdFeedWidth}px`);

  report.testedViewports[width] = {
    docMetrics,
    overflowingElements,
    cal1Metrics,
    cal2Metrics,
    cal3Metrics,
    dashboardMetrics
  };
}

// Switch back to grid view
await client.eval(`
  (() => {
    const gridTab = document.querySelector('.calendar-tab-btn[data-view="grid"]');
    if (gridTab) gridTab.click();
  })()
`);

// Shutdown
console.log('\nClosing headless browser and server...');
browserProc.kill();
server.close();

console.log('='.repeat(80));
console.log('  EMPIRICAL VIEWPORT GEOMETRY VERIFICATION COMPLETE');
console.log('='.repeat(80));

// Save report for inspection
fs.writeFileSync(path.join(REPO_ROOT, 'tests', 'm2_viewport_geometry_results.json'), JSON.stringify(report, null, 2));
console.log('Results written to tests/m2_viewport_geometry_results.json');
