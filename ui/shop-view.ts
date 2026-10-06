import {
  byNewest,
  newEntryId,
  NOTE_MAX_LENGTH,
  pickedDate,
  summarize,
  today,
  withEntry,
  withoutEntry,
  type Draft,
  type Entry,
} from '@/core/model';
import { TAGS, tagsFor } from '@/core/tags';
import { formatDay, monthName, t, tagLabel } from '@/platform/i18n';
import { askForBanner, hasBanner } from '@/platform/permissions';
import { clearDraft, loadDraft, loadSettings, loadShop, saveDraft, saveShop } from '@/platform/store';
import { openSettings } from '@/platform/windows';
import { fill, h } from './dom';
import { icon } from './icons';
import { standingLabel, summaryText } from './labels';

type Mode =
  | { kind: 'list' }
  | { kind: 'form'; entry: Entry | null; draft?: Draft }
  | { kind: 'confirm-delete'; id: string };

/** How many years back the date can be set, beyond the entry's own year. */
const YEARS_BACK = 10;

/**
 * Everything about one shop: its standing, its entries, and the form that adds
 * or edits one. The popup shows it for the shop in the active tab, the overview
 * page for the shop the user picked.
 */
export async function mountShopView(container: HTMLElement, domain: string): Promise<void> {
  let [shop, banner] = await Promise.all([loadShop(domain), hasBanner(domain)]);
  const [unfinished, settings] = await Promise.all([loadDraft(domain), loadSettings()]);
  /** Whether saving or the notice will make the browser ask for access. */
  const willAsk = () => !banner && settings.banner !== 'off';
  let mode: Mode = unfinished
    ? {
        kind: 'form',
        entry: shop.entries.find((entry) => entry.id === unfinished.entryId) ?? null,
        draft: unfinished,
      }
    : restingMode();
  container.classList.add('shop-view');

  /** The list, or an empty form for a shop that has nothing to list. */
  function restingMode(): Mode {
    return shop.entries.length > 0 ? { kind: 'list' } : { kind: 'form', entry: null };
  }

  function show(next: Mode) {
    mode = next;
    render();
    if (next.kind === 'form') {
      container.querySelector<HTMLInputElement>('input[name="verdict"]')?.focus();
    }
  }

  function render() {
    const summary = summarize(shop);
    fill(
      container,
      h(
        'header',
        { class: 'shop-head' },
        h('h2', {}, domain),
        summary
          ? h(
              'p',
              { class: 'standing', 'data-standing': summary.standing },
              icon(summary.standing),
              summaryText(summary),
            )
          : h('p', { class: 'muted' }, t('shopNoNotes')),
      ),
      summary && willAsk() && bannerNotice(),
      mode.kind === 'form' ? entryForm(mode.entry, mode.draft) : entryList(),
    );
  }

  function bannerNotice() {
    // A click handler, so the permission prompt is allowed to open.
    const turnOn = () => {
      void askForBanner(settings.banner, domain).then((granted) => {
        banner = granted;
        render();
      });
    };
    return h(
      'p',
      { class: 'notice' },
      t('bannerOff'),
      ' ',
      h('button', { type: 'button', class: 'link', onclick: turnOn }, t('bannerTurnOn')),
    );
  }

  function entryList() {
    return h(
      'div',
      { class: 'entry-list' },
      h('ul', { class: 'entries' }, ...byNewest(shop.entries).map(entryItem)),
      h(
        'button',
        { type: 'button', class: 'primary', onclick: () => show({ kind: 'form', entry: null }) },
        t('addExperience'),
      ),
    );
  }

  function entryItem(entry: Entry) {
    const confirming = mode.kind === 'confirm-delete' && mode.id === entry.id;
    return h(
      'li',
      { class: 'entry' },
      h(
        'div',
        { class: 'entry-head' },
        h(
          'span',
          { class: 'standing', 'data-standing': entry.verdict },
          icon(entry.verdict),
          standingLabel(entry.verdict),
        ),
        h('time', { class: 'muted', datetime: entry.date }, formatDay(entry.date)),
      ),
      entry.tags.length > 0 &&
        h('ul', { class: 'chips' }, ...entry.tags.map((code) => h('li', { class: 'chip' }, tagLabel(code)))),
      entry.note && h('p', { class: 'note' }, entry.note),
      confirming
        ? h(
            'div',
            { class: 'actions' },
            h('span', {}, t('confirmDelete')),
            h('button', { type: 'button', class: 'danger', onclick: () => remove(entry.id) }, t('delete')),
            h('button', { type: 'button', onclick: () => show({ kind: 'list' }) }, t('cancel')),
          )
        : h(
            'div',
            { class: 'actions' },
            h('button', { type: 'button', class: 'link', onclick: () => show({ kind: 'form', entry }) }, t('edit')),
            h(
              'button',
              { type: 'button', class: 'link', onclick: () => show({ kind: 'confirm-delete', id: entry.id }) },
              t('delete'),
            ),
          ),
    );
  }

  function remove(id: string) {
    const next = withoutEntry(shop, id);
    void saveShop(domain, next).then(() => {
      shop = next;
      show(restingMode());
    });
  }

  function entryForm(entry: Entry | null, draft?: Draft) {
    const start = draft ?? {
      verdict: entry?.verdict ?? null,
      tags: entry?.tags ?? [],
      note: entry?.note ?? '',
      date: entry?.date ?? today(),
    };
    const error = h('p', { class: 'error', role: 'alert', hidden: true });
    const fail = (message: string) => {
      error.textContent = message;
      error.hidden = false;
    };

    const tagPicker = h(
      'fieldset',
      { class: 'tag-picker', hidden: !start.verdict },
      h('legend', {}, t('formTagsLegend')),
      ...(['good', 'bad'] as const).map((verdict) =>
        h(
          'div',
          { class: 'chips', 'data-verdict': verdict, hidden: start.verdict !== verdict },
          ...tagsFor(verdict).map((code) =>
            h(
              'label',
              { class: 'chip' },
              h('input', { type: 'checkbox', name: 'tag', value: code, checked: start.tags.includes(code) }),
              tagLabel(code),
            ),
          ),
        ),
      ),
    );

    const read = (): Draft => {
      const data = new FormData(form);
      const verdict = data.get('verdict');
      return {
        entryId: entry?.id ?? null,
        verdict: verdict === 'good' || verdict === 'bad' ? verdict : null,
        tags: data.getAll('tag').map(String),
        note: String(data.get('note') ?? ''),
        date: pickedDate(Number(data.get('year')), Number(data.get('month')), Number(data.get('day'))),
      };
    };

    // Runs on every change in the form. Only the tags that belong to the
    // chosen verdict are shown, and a tag ticked under the other verdict must
    // not come along. What the form holds is then kept as a draft, because the
    // toolbar popup closes as soon as the user looks at something else.
    const onInput = () => {
      const chosen = new FormData(form).get('verdict');
      tagPicker.hidden = chosen === null;
      for (const group of tagPicker.querySelectorAll<HTMLElement>('.chips')) {
        group.hidden = group.dataset.verdict !== chosen;
        if (!group.hidden) continue;
        for (const box of group.querySelectorAll('input')) box.checked = false;
      }
      void saveDraft(domain, read());
    };

    const submit = (event: Event) => {
      event.preventDefault();
      const filled = read();
      if (!filled.verdict) {
        fail(t('formVerdictMissing'));
        return;
      }
      const note = filled.note.trim();
      const next = withEntry(shop, {
        id: entry?.id ?? newEntryId(),
        date: filled.date,
        verdict: filled.verdict,
        tags: [...filled.tags, ...unknownTags(entry)],
        ...(note && { note }),
      });

      // All three calls are made before anything is awaited. The save is then
      // on its way even if the permission prompt closes the popup, and the
      // prompt needs the click that is still in progress.
      const saving = saveShop(domain, next);
      void clearDraft(domain);
      const asking = askForBanner(settings.banner, domain);
      void saving.then(
        async () => {
          shop = next;
          show({ kind: 'list' });
          banner = await asking;
          render();
        },
        () => {
          void saveDraft(domain, filled);
          fail(t('saveFailed'));
        },
      );
    };

    const cancel = () => {
      void clearDraft(domain);
      show(restingMode());
    };

    const form = h(
      'form',
      { class: 'entry-form', onsubmit: submit, oninput: onInput },
      h(
        'fieldset',
        { class: 'verdicts' },
        h('legend', {}, t('formVerdictLegend')),
        ...(['good', 'bad'] as const).map((verdict) =>
          h(
            'label',
            { class: 'verdict', 'data-standing': verdict },
            h('input', { type: 'radio', name: 'verdict', value: verdict, checked: start.verdict === verdict }),
            icon(verdict),
            standingLabel(verdict),
          ),
        ),
      ),
      tagPicker,
      h(
        'label',
        { class: 'field' },
        h('span', {}, t('formNoteLabel')),
        h('textarea', { name: 'note', rows: '2', maxlength: String(NOTE_MAX_LENGTH) }, start.note),
      ),
      dateFields(start.date),
      error,
      // The browser's own prompt says what access would allow, not what it is
      // for. This says so first, and leads to the setting that stops the asking.
      willAsk() &&
        h(
          'p',
          { class: 'muted access-note' },
          t(settings.banner === 'all' ? 'accessAskAll' : 'accessAskShop', domain),
          ' ',
          h('button', { type: 'button', class: 'link', onclick: () => void openSettings() }, t('settingsHeading')),
        ),
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'submit', class: 'primary' }, t('save')),
        h('button', { type: 'button', onclick: cancel }, t('cancel')),
      ),
    );
    return form;
  }

  render();
}

/**
 * Three plain lists and not a date input: Firefox opens the calendar of a date
 * input behind the toolbar popup, where it cannot be reached.
 */
function dateFields(date: string) {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const thisYear = new Date().getFullYear();
  const years = range(Math.min(year, thisYear - YEARS_BACK), thisYear).reverse();
  const list = (
    name: string,
    label: string,
    values: number[],
    chosen: number,
    text: (value: number) => string = String,
  ) => {
    const select = h(
      'select',
      { name, 'aria-label': label },
      ...values.map((value) => h('option', { value: String(value) }, text(value))),
    );
    select.value = String(chosen);
    return select;
  };

  return h(
    'fieldset',
    { class: 'date' },
    h('legend', {}, t('formDateLabel')),
    list('day', t('formDay'), range(1, 31), day),
    list('month', t('formMonth'), range(1, 12), month, monthName),
    list('year', t('formYear'), years, year),
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

/** Tags from a newer version have no checkbox here and must survive an edit. */
function unknownTags(entry: Entry | null): string[] {
  const known = new Set(TAGS.map((tag) => tag.code));
  return entry?.tags.filter((code) => !known.has(code)) ?? [];
}
