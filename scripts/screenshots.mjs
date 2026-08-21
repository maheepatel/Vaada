/**
 * Captures the screenshots used in README.md.
 *
 *   npm run dev                  # in one terminal
 *   node scripts/screenshots.mjs
 *
 * Drives headless Chrome over the DevTools Protocol. Two earlier approaches
 * failed and are worth recording so nobody retries them:
 *
 *   `--screenshot` with `--window-size=390,860` produces a 390px-wide PNG, but
 *   Chrome lays the page out at its own minimum width and then crops. The
 *   mobile shot came out looking like a broken desktop layout. Switching to
 *   `--headless` (old mode) changed nothing.
 *
 *   `--force-device-scale-factor=2` cropped the right third of the page,
 *   because that flag and `--window-size` disagree about CSS versus device
 *   pixels.
 *
 * `Emulation.setDeviceMetricsOverride` sets a real viewport, which is the only
 * thing that actually works. No Playwright or Puppeteer: those download their
 * own browser, which is a lot of weight for a script that runs when the UI
 * changes and never in CI. Node's built-in WebSocket does the rest.
 *
 * Re-run after any visual change, so the README never shows a UI that no longer
 * exists.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

const BASE = process.env.SHOT_BASE ?? 'http://localhost:5300';
const OUT = path.join(process.cwd(), 'docs', 'screenshots');
const PORT = 9333;

const SHOTS = [
  { name: 'home', path: '/', w: 1280, h: 980 },
  { name: 'rankings', path: '/rankings', w: 1280, h: 980 },
  { name: 'district', path: '/s/rajasthan/alwar', w: 1280, h: 900 },
  { name: 'promise', path: '/p/jodhawas-commuting-road', w: 1280, h: 980 },
  { name: 'submit', path: '/submit', w: 1280, h: 900 },
  { name: 'authority', path: '/authority', w: 1280, h: 900 },
  { name: 'deadlines', path: '/deadlines', w: 1280, h: 900 },
  { name: 'home-mobile', path: '/', w: 390, h: 860, mobile: true },
  { name: 'promise-mobile', path: '/p/jodhawas-commuting-road', w: 390, h: 860, mobile: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Minimal CDP client over one page target. */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      const resolve = this.pending.get(msg.id);
      if (resolve) {
        this.pending.delete(msg.id);
        resolve(msg.result);
      }
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve) => this.pending.set(id, resolve));
  }
}

function findBrowser() {
  const found = CANDIDATES.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });
  if (!found) {
    console.error('No Chrome or Edge found. Set CHROME_PATH and retry.');
    process.exit(1);
  }
  return found;
}

async function waitForDevtools() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`, {
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      // Not up yet.
    }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a DevTools endpoint.');
}

async function main() {
  const browser = findBrowser();
  fs.mkdirSync(OUT, { recursive: true });

  try {
    const res = await fetch(BASE, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    console.error(`Nothing responding at ${BASE}. Start the dev server first.`);
    process.exit(1);
  }

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vaada-shots-'));
  const chrome = spawn(
    browser,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  try {
    await waitForDevtools();

    for (const shot of SHOTS) {
      const target = await (
        await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
      ).json();

      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve) => ws.addEventListener('open', resolve));
      const cdp = new Cdp(ws);

      await cdp.send('Page.enable');
      // The part that matters: a real viewport, not a cropped window.
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width: shot.w,
        height: shot.h,
        deviceScaleFactor: 2,
        mobile: Boolean(shot.mobile),
      });

      await cdp.send('Page.navigate', { url: `${BASE}${shot.path}` });
      // Long enough for the webfont swap and the first countdown paint.
      await sleep(2500);

      const { data } = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const file = path.join(OUT, `${shot.name}.png`);
      fs.writeFileSync(file, Buffer.from(data, 'base64'));
      ws.close();
      await fetch(`http://127.0.0.1:${PORT}/json/close/${target.id}`);

      const kb = (fs.statSync(file).size / 1024).toFixed(0);
      console.log(`✓ ${shot.name.padEnd(14)} ${shot.w}x${shot.h}  ${kb}kb`);
    }
  } finally {
    chrome.kill();
    // Chrome releases its profile lock a moment after the process dies, so an
    // immediate delete fails with EPERM on Windows. The directory is in the OS
    // temp folder either way, so a failure here is not worth reporting as one.
    await sleep(500);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {
      // Left for the OS to clean up.
    }
  }

  console.log(`\nWritten to ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
