import '@/ui/base.css';
import '@/ui/shop-view.css';
import '@/ui/overview.css';
import { browser } from '@/platform/browser';
import { mountOverview } from '@/ui/overview';

document.documentElement.lang = browser.i18n.getUILanguage();
// The right-click menu opens this page with the shop it was used on.
mountOverview(document.body, { open: new URLSearchParams(location.search).get('domain') });
