# Publishing Shop Again?

Everything the three stores ask for, so a release is uploads and form filling. The texts are in `listing.en.md` and `listing.da.md`, the images in `images/`, and this file has the answers to the forms.

## What is in this folder

| File | Is |
|---|---|
| `mark.mjs` | Draws the mark, the small mark, the wordmark and the name into `assets/`, and the name in white into `promo/`, as SVG paths, with the question mark and the text as Poppins glyphs, so a change to the mark is a number here and not a new drawing |
| `fonts.mjs` | Fetches Poppins from Google Fonts into the system temp directory for `mark.mjs` and the tiles, so the repo carries no font files |
| `icons.sh` | Renders `public/icon/*.png` and `images/logo-300.png` from `assets/icon.svg` and `assets/icon-small.svg`, which live in `assets/` because the banner draws the small mark from the same file |
| `listing.en.md`, `listing.da.md` | Name, short description, summary, description and search terms, per language |
| `demo-shop/` | A fictional shop the screenshots are taken on |
| `promo/` | The promotional tiles as HTML, rendered by `screenshots.mjs` |
| `screenshots.mjs` | Takes the screenshots and renders the tiles into `images/` from a Chrome it starts itself |
| `images/` | What gets uploaded |

## Images the stores take

| Image | Chrome Web Store | Edge Add-ons | Firefox Add-ons |
|---|---|---|---|
| Store icon or logo | 128 x 128, `public/icon/128.png`, uploaded on the listing | 300 x 300, `images/logo-300.png` | 128 x 128, `public/icon/128.png`, uploaded under Manage Listing, Images, or the listing shows a puzzle piece |
| Screenshots | 1280 x 800, at least 1, at most 5 | 1280 x 800, at most 6 | Any size, optional |
| Small promotional tile | 440 x 280, listings without one are ranked after those with one | 440 x 280, optional | Not used |
| Marquee or large tile | 1400 x 560, optional | 1400 x 560, optional | Not used |

Screenshots are full bleed, no padding, no rounded corners. The icon has an alpha channel, otherwise Chrome frames it.

## A release

1. Set the version in `package.json` and move the changes in `CHANGELOG.md` from Unreleased to a release section with today's date.
2. `npm test && npm run compile && npm run build:firefox && npm run lint:firefox`.
3. `npm run zip && npm run zip:firefox`, which leaves three files in `.output/`: `shop-again-X.Y.Z-chrome.zip` for Chrome and Edge, `shop-again-X.Y.Z-firefox.zip` for Firefox, and `shop-again-X.Y.Z-sources.zip` for Mozilla's reviewers.
4. Commit, tag `vX.Y.Z`, push.
5. Upload to the three stores as below. A release only reaches users when each store has reviewed it, which takes from hours (Firefox, usually) to days (Chrome, up to a week for the first version, Edge up to seven business days).

## Answers the forms ask for

The same answers go to Chrome and Edge, and Firefox asks for a subset.

**Single purpose.** Keeps the user's own private notes on their experiences with web shops and shows them as a banner when the user returns to a shop.

**Permission justifications.**

- `storage`: The notes and the settings are kept in the browser's sync storage so they follow the user's browser account. Session storage remembers which banners were seen in this browser session and a note the user has not finished.
- `activeTab`: To read the address of the tab the popup was opened on, so the note is attached to the right shop. Nothing else is read from the page.
- `scripting`: To register the banner content script for exactly the shops the user has notes on and has given access to, with `scripting.registerContentScripts`. No script runs anywhere else.
- `contextMenus`: Two entries, for the page and for a link, that open the notes for that shop. Can be turned off in the settings.
- Host permissions (`optional_host_permissions`, `*://*/*`): Not requested at install. When the user saves a note about a shop, the extension asks for access to that one domain, which is what lets the banner appear there. The user can instead choose in the settings to give access to every site once, or to never be asked, in which case there is no banner. Access to a shop is released when its last note is deleted.

**Remote code.** No.

**Data usage.** The extension collects no user data. Nothing leaves the browser: no server, no network requests, no analytics. The notes are stored with the browser's own sync storage. Certify the limited use disclosures.

**Privacy policy URL.** https://github.com/ronnidc/shop-again/blob/main/PRIVACY.md. The repository has to be public for the URL to work, and the stores check it.

**Homepage, support site and support email.** https://github.com/ronnidc/shop-again, https://github.com/ronnidc/shop-again/issues and support@ronnidc.com. Chrome has no support email field: the listing shows the developer account's verified contact email, which is set to the same address on the account page.

**Notes to the reviewers.** Paste as is:

> Shop Again? keeps the user's own notes on web shops and shows them as a banner when the user comes back. To test: open any web shop, click the toolbar button, choose Good or Bad, pick a reason and click Save. The browser then asks for access to that shop's domain, which is only used to show the banner there. Reload the shop to see the banner. The popup's "All shops" link opens the overview page with every shop, the settings, export and import. There is no server, no network request and no remote code. The source builds with Node 24 and npm: `npm ci` and `npm run build:firefox` (or `npm run build` for Chrome), see "Building from source" in the README.

Chrome's test instructions field (under Access) takes 500 characters, so Chrome gets this one, 495 characters:

> Keeps the user's own notes on web shops and shows them as a banner when the user comes back. To test: open any web shop, click the toolbar button, choose Good or Bad, pick a reason and click Save. The browser asks for access to that shop's domain, used only to show the banner there. Reload the shop to see it. "All shops" in the popup opens the overview page with every shop, the settings, export and import. No server, no network requests, no remote code. Source: github.com/ronnidc/shop-again

## Chrome Web Store

- Account: https://chrome.google.com/webstore/devconsole, a one-time registration fee of 5 USD, and the Google account needs 2-step verification.
- New item, upload `shop-again-X.Y.Z-chrome.zip`.
- Store listing: the description from `listing.en.md`, category Shopping, language English. Add Danish as a second language from the language menu and paste `listing.da.md`. Upload the screenshots and the two promotional tiles from `images/` as global assets, which every language inherits, and leave the localized assets empty: a localized set only overrides the global one for its language, and is for the day there are Danish screenshots. The store icon is `public/icon/128.png`, which the listing asks for although the package carries it.
- Privacy practices: single purpose, permission justifications, remote code and data usage from above, and the privacy policy URL and the contact email under the account's settings.
- Distribution: public, all regions, free.
- Submit for review. New items with a broad optional host permission can take longer.

## Edge Add-ons

- Account: https://partner.microsoft.com/dashboard/microsoftedge, free.
- Create new extension, upload `shop-again-X.Y.Z-chrome.zip`.
- Availability: public, all markets.
- Properties: category Shopping, website and support contact from above.
- Privacy: the same answers as Chrome.
- Store listings: a row per language in the package, English and Danish. Each needs the description and the logo (`images/logo-300.png`). The name and the short description come from the manifest. Screenshots and tiles can be duplicated to the other language with the button under each.
- Publish asks whether a tester needs credentials or other info. Answer yes, although there are no credentials: no disables the notes field, and the banner is conditional on a saved note and an access grant, which is what the notes explain (Microsoft's own example 2 under the field). Paste the reviewer notes above, up to 2,000 characters, and publish.

## Firefox Add-ons

- Account: https://addons.mozilla.org/developers/, free.
- Submit a new add-on, listed on this site, upload `shop-again-X.Y.Z-firefox.zip`.
- The build is bundled and minified, so answer yes to "Do you need to submit source code?" and upload `shop-again-X.Y.Z-sources.zip`. The README in it has the build instructions. Mozilla rebuilds the package and diffs it against the upload, and the build is deterministic, so they match.
- Listing: name, summary and description from `listing.en.md`, category Shopping, support site and support email, license GNU General Public License v3.0 from the menu, privacy policy pasted in full (AMO wants the text, not a link). English only: AMO has no Danish locale, so `listing.da.md` is for Chrome and Edge, and the extension's own Danish comes from the package. Screenshots are optional and take any size, the 1280 x 800 ones do, and they are uploaded after the submission under Manage Listing, Images, each with a caption: the title and subtitle its frame shows, from `SHOTS` in `screenshots.mjs`.
- Notes to reviewer: the reviewer notes above.
- The add-on ID `shop-again@ronnidc` in `wxt.config.ts` is permanent from the first upload.
- Firefox for Android is out until a version has been tried on a phone: the right-click menu and the badge do not exist there, and the background registers the menu listener unconditionally, so the banner never loads. The manifest decides this, not AMO: since 2023 AMO reads Android compatibility from the `gecko_android` key alone, the compatibility checkbox at upload is disabled, and 1.0.0 went up listed for Android because the key was there. 1.0.1 dropped the key and raised the Firefox minimum to 142, the version the linter wants when it holds Android to the desktop minimum. Keep the key out until Android is meant.

## Before the first upload

- The name is "Shop Again?", decided 2026-10-09. The question mark goes wherever the name is written for people: listings, texts, images and the extension's own pages. Identifiers carry none of it: `shop-again` in the package name, the add-on ID, the export file name and the repository. The closest trademark is SHOPAGAIN, US registration 7253456 (LatticeAI Inc., classes 35 and 42, registered 2023-12-26), a retention marketing platform for Shopify stores. Its app left the Shopify App Store in July 2025, its sites are down, and its North Carolina registration was revoked in November 2024, so a complaint is not expected. The registration itself stands until its maintenance filing falls due in 2029, so the name cannot be registered in the US before then. The other marks with the words are an Italian E-SHOPAGAIN from 2001 and a French second-hand retail chain from 2023.
- The publisher is `ronnidc` on a personal account in each store, the same name as on the VS Code Marketplace and in the add-on ID, decided 2026-10-09. A non-trader under the EU Digital Services Act, because nothing is sold behind the extension, so the listing shows no address or phone number. The publisher is set per account, not per extension, so every later extension shares it. Should one ever support something sold, that one moves to Kudo Technologies ApS as a trader: Chrome and Firefox transfer an item to another publisher, Edge only through support.
- The repository has to be public, or the privacy policy and the homepage need another address.
- The public contact is support@ronnidc.com, decided 2026-10-16: the Chrome account's verified contact email, Edge's support contact and AMO's support email, and the address in the extension's footer and the repository's issue forms. It is on the publisher's own domain so the personal address stays off three public listings, and it has to receive mail before the first upload, because Chrome verifies it with a link. The login accounts do not change.
- The license is GPL-3.0, decided 2026-10-12: `LICENSE` in the repository, `GPL-3.0-only` in `package.json`, and the README says that the name and the mark are not licensed, as section 7 of the GPL allows. A permissive license would have let a renamed copy with tracking into the stores next to this one. Copyleft does not stop a copy, but it has to publish its source under the same license.
