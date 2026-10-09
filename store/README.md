# Publishing Shop Again?

Everything the three stores ask for, so a release is uploads and form filling. The texts are in `listing.en.md` and `listing.da.md`, the images in `images/`, and this file has the answers to the forms.

## What is in this folder

| File | Is |
|---|---|
| `icon.svg` | The icon. `icons.sh` renders `public/icon/*.png` and `images/logo-300.png` from it |
| `listing.en.md`, `listing.da.md` | Name, short description, summary, description and search terms, per language |
| `demo-shop/` | A fictional shop the screenshots are taken on |
| `promo/` | The promotional tiles as HTML, rendered by `screenshots.mjs` |
| `screenshots.mjs` | Takes the screenshots and renders the tiles into `images/` from a Chrome it starts itself |
| `images/` | What gets uploaded |

## Images the stores take

| Image | Chrome Web Store | Edge Add-ons | Firefox Add-ons |
|---|---|---|---|
| Store icon or logo | 128 x 128, from the package | 300 x 300, `images/logo-300.png` | 128 x 128, from the package |
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

**Homepage and support.** https://github.com/ronnidc/shop-again and https://github.com/ronnidc/shop-again/issues.

**Notes to the reviewers.** Paste as is:

> Shop Again? keeps the user's own notes on web shops and shows them as a banner when the user comes back. To test: open any web shop, click the toolbar button, choose Good or Bad, pick a reason and click Save. The browser then asks for access to that shop's domain, which is only used to show the banner there. Reload the shop to see the banner. The popup's "All shops" link opens the overview page with every shop, the settings, export and import. There is no server, no network request and no remote code. The source builds with Node 24 and npm: `npm ci` and `npm run build:firefox` (or `npm run build` for Chrome), see "Building from source" in the README.

## Chrome Web Store

- Account: https://chrome.google.com/webstore/devconsole, a one-time registration fee of 5 USD, and the Google account needs 2-step verification.
- New item, upload `shop-again-X.Y.Z-chrome.zip`.
- Store listing: the description from `listing.en.md`, category Shopping, language English. Add Danish as a second language from the language menu and paste `listing.da.md`. Upload the screenshots and the small promotional tile from `images/`. The store icon is read from the package.
- Privacy practices: single purpose, permission justifications, remote code and data usage from above, and the privacy policy URL under the account's settings.
- Distribution: public, all regions, free.
- Submit for review. New items with a broad optional host permission can take longer.

## Edge Add-ons

- Account: https://partner.microsoft.com/dashboard/microsoftedge, free.
- Create new extension, upload `shop-again-X.Y.Z-chrome.zip`.
- Availability: public, all markets.
- Properties: category Shopping, website and support contact from above.
- Privacy: the same answers as Chrome.
- Store listings: a row per language in the package, English and Danish. Each needs the description and the logo (`images/logo-300.png`). The name and the short description come from the manifest. Screenshots and tiles can be duplicated to the other language with the button under each.
- Notes for certification: the reviewer notes above. Publish.

## Firefox Add-ons

- Account: https://addons.mozilla.org/developers/, free.
- Submit a new add-on, listed on this site, upload `shop-again-X.Y.Z-firefox.zip`.
- The build is bundled and minified, so answer yes to "Do you need to submit source code?" and upload `shop-again-X.Y.Z-sources.zip`. The README in it has the build instructions. Mozilla rebuilds the package and diffs it against the upload, and the build is deterministic, so they match.
- Listing: name, summary and description from `listing.en.md`, Danish from `listing.da.md` under the language menu, category Shopping, support site, license (MIT if the repository gets one), privacy policy pasted in full (AMO wants the text, not a link). Screenshots are optional and take any size, the 1280 x 800 ones do.
- Notes to reviewer: the reviewer notes above.
- The add-on ID `shop-again@ronnidc` in `wxt.config.ts` is permanent from the first upload.
- The manifest declares Firefox for Android (142 and up). Until it has been tried on a phone, untick Android under compatibility on AMO, or try it first: the popup opens as a page there and the banner needs the content script to run, which it does.

## Before the first upload

- The name is "Shop Again?", decided 2026-10-09. The question mark goes wherever the name is written for people: listings, texts, images and the extension's own pages. Identifiers carry none of it: `shop-again` in the package name, the add-on ID, the export file name and the repository. The closest trademark is SHOPAGAIN, US registration 7253456 (LatticeAI Inc., classes 35 and 42, registered 2023-12-26), a retention marketing platform for Shopify stores. Its app left the Shopify App Store in July 2025, its sites are down, and its North Carolina registration was revoked in November 2024, so a complaint is not expected. The registration itself stands until its maintenance filing falls due in 2029, so the name cannot be registered in the US before then. The other marks with the words are an Italian E-SHOPAGAIN from 2001 and a French second-hand retail chain from 2023.
- The repository has to be public, or the privacy policy and the homepage need another address.
- A license file in the repository, MIT is the obvious one, because Firefox asks for one and a public repository needs one.
- Rendered icons in `public/icon/` from `icons.sh`, not the WXT placeholders.
