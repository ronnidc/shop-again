import {
  byNewest,
  newEntryId,
  NOTE_MAX_LENGTH,
  summarize,
  today,
  withEntry,
  withoutEntry,
  type Entry,
} from '@/core/model';
import { TAGS, tagsFor } from '@/core/tags';
import { formatDay, t, tagLabel } from '@/platform/i18n';
import { hasBanner, requestBanner } from '@/platform/permissions';
import { loadShop, saveShop } from '@/platform/store';
import { fill, h } from './dom';
import { icon } from './icons';
import { standingLabel, summaryText } from './labels';

type Mode =
  | { kind: 'list' }
  | { kind: 'form'; entry: Entry | null }
  | { kind: 'confirm-delete'; id: string };

/**
 * Everything about one shop: its standing, its entries, and the form that adds
 * or edits one. The popup shows it for the shop in the active tab, the overview
 * page for the shop the user picked.
 */
export async function mountShopView(container: HTMLElement, domain: string): Promise<void> {
  let [shop, banner] = await Promise.all([loadShop(domain), hasBanner(domain)]);
  let mode: Mode = shop.entries.length > 0 ? { kind: 'list' } : { kind: 'form', entry: null };
  container.classList.add('shop-view');

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
      summary && !banner && bannerNotice(),
      mode.kind === 'form' ? entryForm(mode.entry) : entryList(),
    );
  }

  function bannerNotice() {
    // A click handler, so the permission prompt is allowed to open.
    const turnOn = () => {
      void requestBanner([domain]).then((granted) => {
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
      show(shop.entries.length > 0 ? { kind: 'list' } : { kind: 'form', entry: null });
    });
  }

  function entryForm(entry: Entry | null) {
    const error = h('p', { class: 'error', role: 'alert', hidden: true });
    const tagPicker = h(
      'fieldset',
      { class: 'tag-picker', hidden: !entry },
      h('legend', {}, t('formTagsLegend')),
      ...(['good', 'bad'] as const).map((verdict) =>
        h(
          'div',
          { class: 'chips', 'data-verdict': verdict, hidden: entry?.verdict !== verdict },
          ...tagsFor(verdict).map((code) =>
            h(
              'label',
              { class: 'chip' },
              h('input', { type: 'checkbox', name: 'tag', value: code, checked: entry?.tags.includes(code) }),
              tagLabel(code),
            ),
          ),
        ),
      ),
    );

    // Only the tags that belong to the chosen verdict are shown, and a tag
    // ticked under the other verdict must not come along.
    const chooseVerdict = (event: Event) => {
      const chosen = (event.target as HTMLInputElement).value;
      tagPicker.hidden = false;
      for (const group of tagPicker.querySelectorAll<HTMLElement>('.chips')) {
        group.hidden = group.dataset.verdict !== chosen;
        if (!group.hidden) continue;
        for (const box of group.querySelectorAll('input')) box.checked = false;
      }
    };

    const submit = (event: Event) => {
      event.preventDefault();
      const data = new FormData(event.target as HTMLFormElement);
      const verdict = data.get('verdict');
      if (verdict !== 'good' && verdict !== 'bad') {
        error.textContent = t('formVerdictMissing');
        error.hidden = false;
        return;
      }
      const note = String(data.get('note') ?? '').trim();
      const next = withEntry(shop, {
        id: entry?.id ?? newEntryId(),
        date: String(data.get('date') || today()),
        verdict,
        tags: [...data.getAll('tag').map(String), ...unknownTags(entry)],
        ...(note && { note }),
      });

      // Both calls are made before anything is awaited. The save is then on
      // its way even if the permission prompt closes the popup, and the prompt
      // needs the click that is still in progress.
      const saving = saveShop(domain, next);
      const asking = requestBanner([domain]);
      void saving.then(
        async () => {
          shop = next;
          show({ kind: 'list' });
          banner = await asking;
          render();
        },
        () => {
          error.textContent = t('saveFailed');
          error.hidden = false;
        },
      );
    };

    return h(
      'form',
      { class: 'entry-form', onsubmit: submit },
      h(
        'fieldset',
        { class: 'verdicts' },
        h('legend', {}, t('formVerdictLegend')),
        ...(['good', 'bad'] as const).map((verdict) =>
          h(
            'label',
            { class: 'verdict', 'data-standing': verdict },
            h('input', {
              type: 'radio',
              name: 'verdict',
              value: verdict,
              checked: entry?.verdict === verdict,
              onchange: chooseVerdict,
            }),
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
        h('textarea', { name: 'note', rows: '3', maxlength: String(NOTE_MAX_LENGTH) }, entry?.note),
      ),
      h(
        'label',
        { class: 'field' },
        h('span', {}, t('formDateLabel')),
        h('input', { type: 'date', name: 'date', value: entry?.date ?? today(), max: today() }),
      ),
      error,
      h(
        'div',
        { class: 'actions' },
        h('button', { type: 'submit', class: 'primary' }, t('save')),
        shop.entries.length > 0 &&
          h('button', { type: 'button', onclick: () => show({ kind: 'list' }) }, t('cancel')),
      ),
    );
  }

  render();
}

/** Tags from a newer version have no checkbox here and must survive an edit. */
function unknownTags(entry: Entry | null): string[] {
  const known = new Set(TAGS.map((tag) => tag.code));
  return entry?.tags.filter((code) => !known.has(code)) ?? [];
}
