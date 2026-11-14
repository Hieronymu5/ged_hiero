import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { buildGenerations } from '../core/ancestry';
import { lifespan } from '../core/gedcom-parser';
import { Person } from '../core/gedcom.model';
import { LanguageService } from '../core/language.service';
import { normalizeText } from '../core/text';
import { TreeStore } from '../core/tree.store';

const MAX_RESULTS = 50;

@Component({
  selector: 'app-person-search',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="search">
      <label class="field-label" for="person-search">{{ i18n.t('search.label') }}</label>
      <input
        id="person-search"
        type="search"
        autocomplete="off"
        [placeholder]="i18n.t('search.placeholder')"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
        (keydown.enter)="pickFirst()"
      />
      @if (query().trim()) {
        <p class="muted small">
          {{ i18n.t('search.matches', { total: matches().total }) }}
          @if (matches().total > results().length) { · {{ i18n.t('search.showingFirst', { count: results().length }) }} }
        </p>
        <ul class="results">
          @for (r of results(); track r.person.id) {
            <li>
              <button type="button" (click)="select(r.person)" [class.active]="store.rootId() === r.person.id">
                <span class="result-name">{{ r.person.fullName }}</span>
                <span class="muted small">
                  {{ r.lifespan }}@if (r.lifespan && r.place) { · }{{ r.place }}
                </span>
                <span class="badge" [title]="i18n.t('search.depthTitle', { depth: r.depth })">{{ i18n.t('search.depthBadge', { depth: r.depth }) }}</span>
              </button>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class PersonSearch {
  protected readonly store = inject(TreeStore);
  protected readonly i18n = inject(LanguageService);
  protected readonly query = signal('');

  protected readonly matches = computed(() => {
    const tree = this.store.tree();
    const q = this.query();
    if (!tree || !q.trim()) return { total: 0, people: [] as Person[] };
    const tokens = q.split(/\s+/).filter(Boolean);
    const years = tokens.filter((t) => /^\d{3,4}$/.test(t)).map(Number);
    const words = tokens.filter((t) => !/^\d{3,4}$/.test(t)).map(normalizeText).filter(Boolean);
    const people: Person[] = [];
    for (const person of tree.people.values()) {
      if (!words.every((w) => person.searchKey.includes(w))) continue;
      if (years.length) {
        const born = person.birth?.year ?? person.christening?.year;
        const died = person.death?.year ?? person.burial?.year;
        if (!years.every((y) => y === born || y === died)) continue;
      }
      people.push(person);
    }
    people.sort(
      (a, b) =>
        a.surname.localeCompare(b.surname) ||
        a.givenName.localeCompare(b.givenName) ||
        (a.birth?.year ?? 0) - (b.birth?.year ?? 0),
    );
    return { total: people.length, people };
  });

  protected readonly results = computed(() => {
    const tree = this.store.tree()!;
    return this.matches()
      .people.slice(0, MAX_RESULTS)
      .map((person) => ({
        person,
        lifespan: lifespan(person, this.i18n.lang()),
        place: (person.birth ?? person.christening)?.place?.split(',')[0] ?? '',
        depth: buildGenerations(tree, person.id).length - 1,
      }));
  });

  protected select(person: Person): void {
    this.store.selectRoot(person.id);
  }

  protected pickFirst(): void {
    const first = this.results()[0];
    if (first) this.select(first.person);
  }
}
