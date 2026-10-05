import type { Summary } from './model';

/** What the banner script in a shop's page asks the background script. */
export type Message =
  | { type: 'banner:load' }
  /** The user has had the banner in front of them and it is now out of the way. */
  | { type: 'banner:seen' };

export interface BannerData {
  summary: Summary;
  /** The shop was already seen in this browser session, so start out small. */
  collapsed: boolean;
}
