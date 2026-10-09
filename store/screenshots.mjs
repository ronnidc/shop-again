#!/usr/bin/env node
/**
 * Takes the store screenshots and renders the promotional tiles into
 * store/images/.
 *
 *   npm run build && node store/screenshots.mjs
 *
 * Starts its own Chrome, the installed one or the one in $CHROME, with a copy
 * of the Chrome build that has access to the fictional shops in
 * store/demo-shop/, which this script serves itself. The copy is what gives the
 * banner its access without a permission prompt, which no automation can
 * click. Chrome 137 dropped the --load-extension flag, so the extension is
 * loaded over the DevTools pipe, the way web-ext does it.
 */
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STORE = join(ROOT, 'store');
const IMAGES = join(STORE, 'images');
const BUILD = join(ROOT, '.output/chrome-mv3');
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8731;

// The .example top-level domain is reserved, so no real shop gets a verdict
// in a screenshot. The notes are a few months of shopping, newest first.
const SHOP_BAD = 'brightlamps.example';
const SHOP_GOOD = 'woodandwool.example';
let entries = 0;
const NOTES = {
  [`shop:${SHOP_BAD}`]: {
    entries: [
      entry(17, 'bad', ['slow-delivery', 'wrong-stock'], 'Said "in stock, ships today". Took 19 days and three mails to support.'),
    ],
  },
  [`shop:${SHOP_GOOD}`]: {
    entries: [entry(9, 'good', ['fast-delivery', 'good-service'], 'Ordered Tuesday, on the doorstep Wednesday.')],
  },
  'shop:gadgetbarn.example': {
    entries: [
      entry(181, 'good', ['fast-delivery']),
      entry(56, 'bad', ['hard-return', 'bad-service'], 'The return label never came. Paid the postage myself.'),
    ],
  },
  'shop:petalpost.example': { entries: [entry(98, 'good', ['stock-correct', 'easy-return'])] },
  'shop:tinyparts.example': {
    entries: [
      entry(135, 'bad', ['unexpected-fees'], 'A 14 euro "handling fee" appeared at checkout. Not a word about it on the product page.'),
    ],
  },
  'shop:northcoastgear.example': { entries: [entry(235, 'good', ['fast-delivery', 'good-service'])] },
};

function entry(daysAgo, verdict, tags, note) {
  const date = new Date(Date.now() - daysAgo * 864e5).toISOString().slice(0, 10);
  return {
    id: String(++entries).padStart(8, '0'),
    date,
    verdict,
    tags,
    ...(note && { note }),
    added: `${date}T12:00:00.000Z`,
  };
}

const SHOTS = [
  {
    file: 'screenshot-1-note.png',
    title: 'Note how an order went',
    subtitle: 'Good or bad, what happened, a few words and the date. One click from the toolbar.',
  },
  {
    file: 'screenshot-2-banner.png',
    title: 'Be reminded when you come back',
    subtitle: 'A warning stays until you close it or scroll on. Good news gets out of the way by itself.',
  },
  {
    file: 'screenshot-3-good.png',
    title: 'Good experiences count too',
    subtitle: 'The shop that delivered the next day is easy to find again.',
  },
  {
    file: 'screenshot-4-overview.png',
    title: 'Every shop in one place',
    subtitle: 'Search, filter, settings, and export and import as a file. No account, no server.',
  },
];

async function main() {
  await mkdir(IMAGES, { recursive: true });
  const temp = await mkdtemp(join(tmpdir(), 'shop-again-shots-'));
  const server = await serve(join(STORE, 'demo-shop'), PORT);
  let chrome;
  try {
    const extension = join(temp, 'extension');
    await cp(BUILD, extension, { recursive: true });
    const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
    manifest.host_permissions = ['*://*.example/*'];
    await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));

    chrome = spawn(
      CHROME,
      [
        '--remote-debugging-pipe',
        '--enable-unsafe-extension-debugging',
        `--user-data-dir=${join(temp, 'profile')}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
        `--host-resolver-rules=MAP *.example 127.0.0.1:${PORT}`,
        '--window-size=1500,1000',
        '--window-position=0,0',
        // macOS Chrome follows the system language and ignores --lang. A
        // Cocoa app reads a user default from its own arguments, so this one
        // process is in English whatever the Mac is set to. Chrome also takes
        // the value for an address and opens it in a tab nobody looks at.
        '-AppleLanguages',
        '(en-US)',
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'inherit', 'pipe', 'pipe'] },
    );
    const cdp = connect(chrome);
    const { id } = await cdp.send('Extensions.loadUnpacked', { path: extension });
    const base = `chrome-extension://${id}/`;

    // An extension page has the storage API, and the background registers the
    // banner script when the notes arrive.
    const seed = await openPage(cdp, `${base}options.html`);
    await seed.evaluate(`chrome.storage.sync.set(${JSON.stringify(NOTES)})`);
    await sleep(1500);

    const shop = await openPage(cdp, `http://${SHOP_BAD}/`);
    await shop.metrics(1280, 640, 2);
    await sleep(1500);
    const banner = await shop.screenshot({ width: 1280, height: 640 });

    const note = await popup(cdp, base, seed, shop, async (page) => {
      await page.evaluate(`document.querySelector('button.primary').click()`);
      await page.evaluate(`document.querySelector('input[name="verdict"][value="bad"]').click()`);
      for (const tag of ['slow-delivery', 'wrong-stock']) {
        await page.evaluate(`document.querySelector('input[name="tag"][value="${tag}"]').click()`);
      }
      await page.evaluate(`{
        const area = document.querySelector('textarea[name="note"]');
        area.value = 'Said "in stock, ships today". Took 19 days and three mails to support.';
        area.dispatchEvent(new Event('input', { bubbles: true }));
      }`);
    });

    // The form above was left as a draft, which the next popup would offer
    // to continue. The good shop deserves a clean popup.
    await seed.evaluate('chrome.storage.session.clear()');
    await shop.navigate(`http://${SHOP_GOOD}/`);
    await sleep(1500);
    const good = await popup(cdp, base, seed, shop, async () => {});

    const overview = await openPage(cdp, `${base}options.html`);
    await overview.metrics(1280, 800, 2);
    await sleep(800);
    const all = await overview.screenshot({ width: 1280, height: 800 });

    const frame = await openPage(cdp, 'about:blank');
    const raws = [note, banner, good, all];
    for (const [index, shot] of SHOTS.entries()) {
      const raw = raws[index];
      const html = (await readFile(join(STORE, 'promo/frame.html'), 'utf8'))
        .replaceAll('{{icon}}', pathToFileURL(join(ROOT, 'assets/icon.svg')).href)
        .replaceAll('{{title}}', shot.title)
        .replaceAll('{{subtitle}}', shot.subtitle)
        .replaceAll('{{kind}}', raw.width > 800 ? 'page' : 'popup')
        .replaceAll('{{width}}', String(raw.width))
        .replaceAll('{{image}}', `data:image/png;base64,${raw.png.toString('base64')}`);
      const file = join(temp, `frame-${index}.html`);
      await writeFile(file, html);
      await frame.navigate(pathToFileURL(file).href);
      await frame.metrics(1280, 800, 1);
      await sleep(400);
      await frame.screenshot({ width: 1280, height: 800 }, join(IMAGES, shot.file));
      console.log(shot.file);
    }

    for (const [file, width, height] of [
      ['tile-440x280.png', 440, 280],
      ['marquee-1400x560.png', 1400, 560],
    ]) {
      await frame.navigate(pathToFileURL(join(STORE, `promo/${file.split('-')[0]}.html`)).href);
      await frame.metrics(width, height, 1);
      await sleep(400);
      await frame.screenshot({ width, height }, join(IMAGES, file));
      console.log(file);
    }
  } finally {
    if (chrome) {
      // Chrome writes to its profile while it shuts down, so the folder can
      // only go once it has exited.
      const exited = new Promise((done) => chrome.once('exit', done));
      chrome.kill();
      await exited;
    }
    server.close();
    await rm(temp, { recursive: true, force: true });
  }
}

/**
 * Opens the toolbar popup on the shop in `tab` and screenshots it. The popup
 * is a real one, opened by the extension API from an extension page, because
 * popup.html opened as a tab would see itself as the active tab.
 */
async function popup(cdp, base, extensionPage, tab, prepare) {
  await cdp.send('Target.activateTarget', { targetId: tab.targetId });
  await extensionPage.evaluate('chrome.action.openPopup()', { userGesture: true });
  const target = await poll(async () => {
    const { targetInfos } = await cdp.send('Target.getTargets');
    return targetInfos.find((info) => info.type === 'page' && info.url === `${base}popup.html`);
  });
  const page = await attach(cdp, target.targetId);
  await sleep(600);
  await prepare(page);
  // The form focuses its first field, and a focus ring is noise in a picture.
  await page.evaluate('document.activeElement?.blur()');
  await sleep(500);
  const [width, height] = await page.evaluate('[innerWidth, innerHeight]');
  const shot = await page.screenshot({ width, height });
  await page.evaluate('window.close()');
  await sleep(300);
  return shot;
}

function connect(child) {
  const toChrome = child.stdio[3];
  const fromChrome = child.stdio[4];
  const pending = new Map();
  const listeners = new Set();
  let nextId = 0;
  let buffer = '';
  fromChrome.setEncoding('utf8');
  fromChrome.on('data', (chunk) => {
    buffer += chunk;
    let end;
    while ((end = buffer.indexOf('\0')) !== -1) {
      const message = JSON.parse(buffer.slice(0, end));
      buffer = buffer.slice(end + 1);
      if (message.id === undefined) {
        for (const listener of listeners) listener(message);
        continue;
      }
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolve(message.result);
    }
  });
  return {
    send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, { resolve, reject });
        toChrome.write(`${JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) })}\0`);
      });
    },
    once(matches) {
      return new Promise((resolve) => {
        const listener = (message) => {
          if (!matches(message)) return;
          listeners.delete(listener);
          resolve(message);
        };
        listeners.add(listener);
      });
    },
  };
}

async function openPage(cdp, url) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const page = await attach(cdp, targetId);
  await page.navigate(url);
  return page;
}

async function attach(cdp, targetId) {
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  // The extension follows the system's light or dark look. The store pictures
  // are light whatever this Mac is set to.
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  return {
    targetId,
    async navigate(url) {
      const loaded = cdp.once((message) => message.sessionId === sessionId && message.method === 'Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
    },
    async evaluate(expression, options = {}) {
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
        ...options,
      });
      if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
      return result.value;
    },
    metrics(width, height, deviceScaleFactor) {
      return send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor, mobile: false });
    },
    /** The PNG with its size in CSS pixels, and written to `file` when given. */
    async screenshot({ width, height }, file) {
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      const png = Buffer.from(data, 'base64');
      if (file) await writeFile(file, png);
      return { png, width, height };
    },
  };
}

function serve(dir, port) {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    const file = join(dir, path.endsWith('/') ? `${path}index.html` : path);
    try {
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((done) => server.listen(port, '127.0.0.1', () => done(server)));
}

async function poll(find, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const found = await find();
    if (found) return found;
    await sleep(100);
  }
  throw new Error('Gave up waiting');
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

await main();
