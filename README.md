# Shop Again?

A browser extension for Chrome, Edge and Firefox that remembers your own experiences with web shops. You note how an order went, good or bad, and the next time you open that shop a banner reminds you.

Status: project skeleton. The popup only shows which site the active tab is on.

## Decisions

- **Private notes, no server.** Notes live in `storage.sync`, which follows the browser account the user is already signed in to, with JSON export and import as backup and as the bridge between browsers. There is no account, no backend and no data collection.
- **Access one shop at a time.** The extension asks for no site access at install. Saving a note about a shop asks for access to that one domain (`optional_host_permissions`), which is what lets the banner appear there. Without it the note is still saved and shown in the popup.
- **Good and bad experiences.** A shop holds several dated entries, each with a verdict, tags and an optional note. Tags are stored as codes, never as text, so they stay small and translatable.
- **A banner on the shop's page.** It sits at the top of the viewport, colored by verdict and never by color alone, shown once per visit and isolated from the page's own CSS.
- **A right-click entry for adding a note**, also on a link to a shop, for example in an order confirmation in webmail. It can be turned off in the extension's settings.
- **Plain TypeScript, no UI framework.** The banner is injected into other people's pages and has to stay tiny, and the popup and the overview page are too small to carry a framework.
- **WXT stays at the edges.** WXT is pre-1.0, so the logic goes in plain modules that only use the standard `browser.*` API. Only the files in `entrypoints/` and `wxt.config.ts` know about WXT.
- **Manifest V3 in every browser**, set in `wxt.config.ts`.
- **English and Danish** from the start, in `public/_locales/`.

Sharing notes between users is out of scope. If it ever happens, only verdicts and tag codes are shared, in aggregate, never free text.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Starts Chrome with the extension loaded and reloads on change |
| `npm run dev:firefox` | The same in Firefox |
| `npm run build` | Builds `.output/chrome-mv3`, which Edge loads too |
| `npm run build:firefox` | Builds `.output/firefox-mv3` |
| `npm run compile` | Type-checks |
| `npm run lint:firefox` | Runs Mozilla's linter on the Firefox build |
| `npm run zip`, `npm run zip:firefox` | Packages for the stores |

## Before the first store upload

- Check the name against trademarks. ShopAgain (shopagain.com) is an existing marketing platform for web shop owners. It is a different product for a different audience, but the name is the same two words.
- The Firefox add-on ID in `wxt.config.ts` is permanent once a version is uploaded to AMO.
- Replace the placeholder icons in `public/icon/`.
