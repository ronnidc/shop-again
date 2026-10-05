import '@/ui/base.css';
import '@/ui/shop-view.css';
import '@/ui/overview.css';
import { browser } from '@/platform/browser';
import { mountOverview } from '@/ui/overview';

document.documentElement.lang = browser.i18n.getUILanguage();
mountOverview(document.body);
