import type { Summary } from './model';

/** What the banner script in a shop's page asks the background script. */
export type Message =
  | { type: 'banner:load' }
  /** The user has had the banner in front of them and it is now out of the way. */
  | { type: 'banner:seen' }
  /** The user wants the notes behind the banner. */
  | { type: 'banner:open' };

export interface BannerData {
  summary: Summary;
  /** The shop was already seen in this browser session, so start out small. */
  collapsed: boolean;
  /** Leave a small tab after the banner is closed, as set by the user. */
  tab: boolean;
}
