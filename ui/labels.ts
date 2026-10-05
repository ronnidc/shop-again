import type { Standing, Summary } from '@/core/model';
import { t } from '@/platform/i18n';

/** "2 good, 1 bad" */
export function summaryText(summary: Summary): string {
  return [
    summary.good > 0 && t('countGood', summary.good),
    summary.bad > 0 && t('countBad', summary.bad),
  ]
    .filter(Boolean)
    .join(', ');
}

export function standingLabel(standing: Standing): string {
  return t(standing === 'good' ? 'verdictGood' : standing === 'bad' ? 'verdictBad' : 'standingMixed');
}
