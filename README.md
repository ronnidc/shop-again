# Shop Again?

A browser extension for Chrome, Edge and Firefox that remembers your own experiences with web shops. You note how an order went, good or bad, and the next time you open that shop a banner reminds you.

Not published yet.

## How it works

- **The toolbar button** opens the notes for the shop in the active tab: its standing, earlier experiences, and a form with a verdict, a set of fixed reasons, an optional note and a date. A shop can also be added by its address on the overview page, or from a link with the right-click menu, because a bad experience usually shows days after the order.
- **A note in progress is never lost.** A toolbar popup closes the moment it loses focus, so what is typed is kept as a draft for the rest of the browser session and is back when the popup is opened again, also from another tab.
- **The banner** appears at the top of a shop the user has notes on. It is a full bar the first time in a browser session and after that a thin line with a tab that brings the bar back. The tab is placed where it covers none of the shop's own buttons, and can be turned off in the settings. Good news gets out of the way by itself, a warning stays until it is closed or scrolled past. The toolbar button carries the verdict as a badge.
- **The overview page** (the extension's options page) lists every shop with search and a filter, and holds the settings, export and import.
- **The right-click menu** opens the overview page with the notes for the current shop, or for the shop a link goes to. It can be turned off in the settings.

## Decisions

- **Private notes, no server.** Notes live in `storage.sync`, which follows the browser account the user is already signed in to, with JSON export and import as backup and as the bridge between browsers. There is no account, no backend and no data collection.
- **Access one shop at a time.** The extension asks for no site access at install. Saving a note about a shop asks for access to that one domain (`optional_host_permissions`), which is what lets the banner appear there. Without it the note is still saved and shown in the popup. Access is given back when a shop's last note is deleted. It does not sync, so each computer asks once. The form says beforehand what the browser will ask and why, and the settings offer two other ways: access to every site given once, or no banner and no asking. Whatever the access, the banner script only ever runs on shops with notes.
- **A shop is a registrable domain.** `www.`, `shop.` and checkout subdomains count as the same shop, and shops on shared platforms such as `name.myshopify.com` are kept apart.
- **Good and bad experiences.** A shop holds several dated entries. Reasons are stored as codes, never as text, so they stay small and translatable.
- **The banner is isolated from the page.** It lives in a closed shadow root with its own colors, and a verdict is never shown by color alone.
- **Plain TypeScript, no UI framework.** The banner is injected into other people's pages and has to stay tiny, and the popup and the overview page are too small to carry a framework.
- **WXT stays at the edges.** WXT is pre-1.0, so only `entrypoints/`, `wxt.config.ts` and `platform/browser.ts` know about it.
- **Manifest V3 in every browser**, set in `wxt.config.ts`.
- **English and Danish** from the start, in `public/_locales/`.

Sharing notes between users is out of scope. If it ever happens, only verdicts and reason codes are shared, in aggregate, never free text.

## Structure

| Folder | Holds | May use |
|---|---|---|
| `core/` | The model, shop names, reasons, the export format | Nothing from the browser |
| `platform/` | Storage, permissions and texts, on top of the extension API | `core/` |
| `ui/` | The shop view, the overview and the banner, as plain DOM | `core/`, `platform/` |
| `entrypoints/` | Popup, options page, background script and banner script | Everything, and WXT |

`ui/banner.ts` is the exception in `ui/`: it runs in the shop's page and uses no extension API.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Starts Chrome with the extension loaded and reloads on change |
| `npm run dev:firefox` | The same in Firefox |
| `npm test` | Runs the unit tests |
| `npm run compile` | Type-checks |
| `npm run build` | Builds `.output/chrome-mv3`, which Edge loads too |
| `npm run build:firefox` | Builds `.output/firefox-mv3` |
| `npm run lint:firefox` | Runs Mozilla's linter on the Firefox build |
| `npm run zip`, `npm run zip:firefox` | Packages for the stores |

In development the extension has access to `localhost`, so a test shop served there gets its banner without a permission prompt.

## Before the first store upload

- Check the name against trademarks. ShopAgain (shopagain.com) is an existing marketing platform for web shop owners. It is a different product for a different audience, but the name is the same two words.
- The Firefox add-on ID in `wxt.config.ts` is permanent once a version is uploaded to AMO.
- Replace the placeholder icons in `public/icon/`.
