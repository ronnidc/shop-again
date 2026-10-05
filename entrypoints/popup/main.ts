import './style.css';
import { browser } from 'wxt/browser';

async function activeShop(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  const { protocol, hostname } = new URL(tab.url);
  return protocol === 'http:' || protocol === 'https:' ? hostname : null;
}

async function render() {
  document.documentElement.lang = browser.i18n.getUILanguage();
  const shop = await activeShop();
  document.querySelector('#shop')!.textContent =
    shop ?? browser.i18n.getMessage('extName');
  document.querySelector('#status')!.textContent = browser.i18n.getMessage(
    shop ? 'popupNoNotes' : 'popupNoShop',
  );
}

render();
