import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { PERIOD_YEARS, stepLabel } from '../core/ancestry';
import { lifespan, locatingEvent } from '../core/gedcom-parser';
import { Person } from '../core/gedcom.model';
import { LanguageService } from '../core/language.service';
import { PlacesService } from '../core/places.service';
import { StepMode, TreeStore } from '../core/tree.store';

@Component({
  selector: 'app-generation-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKey($event)' },
  template: `
    <div class="segmented mode-toggle" role="radiogroup" [attr.aria-label]="i18n.t('mode.aria')">
      @for (option of modes(); track option.value) {
        <button type="button" role="radio" [class.active]="store.mode() === option.value"
                [attr.aria-checked]="store.mode() === option.value" [title]="option.title"
                (click)="store.setMode(option.value)">{{ option.label }}</button>
      }
    </div>

    @if (store.currentStep(); as step) {
      <div class="stepper">
        <button type="button" class="icon-button" (click)="move(1)" [disabled]="step.index >= maxIndex()"
                [attr.aria-label]="text().olderAria" [title]="text().olderTitle">‹</button>
        <div class="stepper-center">
          <strong>{{ title() }}</strong>
          <span class="muted small">{{ subtitle() }}</span>
        </div>
        <button type="button" class="icon-button" (click)="move(-1)" [disabled]="step.index <= 0"
                [attr.aria-label]="text().youngerAria" [title]="text().youngerTitle">›</button>
        <button type="button" class="icon-button play-button" [class.active]="store.playing()"
                (click)="store.togglePlay()" [disabled]="maxIndex() < 1"
                [attr.aria-label]="store.playing() ? i18n.t('stepper.pause.aria') : text().playAria"
                [attr.aria-pressed]="store.playing()"
                [title]="store.playing() ? i18n.t('stepper.pause.title') : text().playTitle">
          @if (store.playing()) {
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx="1" /><rect x="9.5" y="3" width="3" height="10" rx="1" /></svg>
          } @else {
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6a.8.8 0 0 0 1.2.7l7.6-4.8a.8.8 0 0 0 0-1.4L6.2 2.5a.8.8 0 0 0-1.2.7z" /></svg>
          }
        </button>
      </div>
      <input type="range" class="gen-range" min="0" [max]="maxIndex()" [value]="maxIndex() - step.index"
             (input)="store.setStep(maxIndex() - +$any($event.target).value)"
             [attr.aria-label]="text().rangeAria" />

      <div class="stat-row">
        @if (step.kind === 'generation') {
          <div class="stat"><span class="stat-label">{{ i18n.t('stat.people') }}</span><span class="stat-value">{{ step.people.length }}</span></div>
          <div class="stat"><span class="stat-label">{{ i18n.t('stat.possible') }}</span><span class="stat-value">{{ i18n.number(step.possible) }}</span></div>
        } @else {
          <div class="stat"><span class="stat-label">{{ i18n.t('stat.events') }}</span><span class="stat-value">{{ step.events.length }}</span></div>
          <div class="stat"><span class="stat-label">{{ i18n.t('stat.people') }}</span><span class="stat-value">{{ step.people.length }}</span></div>
        }
        <div class="stat"><span class="stat-label">{{ i18n.t('stat.onMap') }}</span><span class="stat-value">{{ located().count }}</span></div>
      </div>

      @if (step.kind === 'period') {
        <ul class="people events">
          @for (row of eventRows(); track row.id) {
            <li (mouseenter)="hoverPerson.emit(row.people[0].id)" (mouseleave)="hoverPerson.emit(null)">
              <span class="event-year">{{ row.year }}</span>
              <div class="person-text">
                <span class="event-names">
                  @for (person of row.people; track person.id; let last = $last) {
                    <button type="button" class="link-button person-name" (click)="store.selectRoot(person.id)"
                            [title]="i18n.t('person.showAncestors')">{{ person.fullName }}</button>@if (!last) { <span class="muted"> & </span> }
                  }
                </span>
                <span class="muted small">
                  {{ row.kind }}@if (row.where) { {{ row.where }} }
                  @if (row.unlocated) { <span class="unlocated" [title]="i18n.t('person.notOnMap.title')">· {{ i18n.t('person.notOnMap') }}</span> }
                </span>
              </div>
            </li>
          }
        </ul>
      } @else {
      <ul class="people">
        @for (row of rows(); track row.person.id) {
          <li (mouseenter)="hoverPerson.emit(row.person.id)" (mouseleave)="hoverPerson.emit(null)">
            <span class="sex" [attr.data-sex]="row.person.sex" aria-hidden="true"></span>
            <div class="person-text">
              <button type="button" class="link-button person-name" (click)="store.selectRoot(row.person.id)"
                      [title]="i18n.t('person.showAncestors')">{{ row.person.fullName }}</button>
              <span class="muted small">
                {{ row.lifespan }}@if (row.lifespan && row.where) { · }
                @if (row.where) { {{ row.kind }} {{ row.where }} }
                @if (row.unlocated) { <span class="unlocated" [title]="i18n.t('person.notOnMap.title')">· {{ i18n.t('person.notOnMap') }}</span> }
              </span>
            </div>
          </li>
        }
      </ul>
      }
    } @else if (store.mode() === 'periods' && store.root()) {
      <p class="muted small">{{ i18n.t('period.empty') }}</p>
    }
  `,
})
export class GenerationStepper {
  protected readonly store = inject(TreeStore);
  private readonly places = inject(PlacesService);
  protected readonly i18n = inject(LanguageService);
  readonly hoverPerson = output<string | null>();
  protected readonly maxIndex = computed(() => this.store.steps().length - 1);

  protected readonly modes = computed<{ value: StepMode; label: string; title: string }[]>(() => [
    {
      value: 'generations',
      label: this.i18n.t('mode.generations'),
      title: this.i18n.t('mode.generations.title'),
    },
    {
      value: 'periods',
      label: this.i18n.t('mode.periods', { years: PERIOD_YEARS }),
      title: this.i18n.t('mode.periods.title', { years: PERIOD_YEARS }),
    },
  ]);

  /** Button and slider labels for the active mode. */
  protected readonly text = computed(() => {
    const t = this.i18n;
    return this.store.mode() === 'periods'
      ? {
          olderAria: t.t('stepper.periodOlder.aria'),
          olderTitle: t.t('stepper.periodOlder.title'),
          youngerAria: t.t('stepper.periodYounger.aria'),
          youngerTitle: t.t('stepper.periodYounger.title'),
          playAria: t.t('stepper.playPeriods.aria'),
          playTitle: t.t('stepper.playPeriods.title'),
          rangeAria: t.t('stepper.periodRange.aria'),
        }
      : {
          olderAria: t.t('stepper.older.aria'),
          olderTitle: t.t('stepper.older.title'),
          youngerAria: t.t('stepper.younger.aria'),
          youngerTitle: t.t('stepper.younger.title'),
          playAria: t.t('stepper.play.aria'),
          playTitle: t.t('stepper.play.title'),
          rangeAria: t.t('stepper.range.aria'),
        };
  });

  protected readonly title = computed(() => {
    const step = this.store.currentStep();
    return step ? stepLabel(step, this.i18n.lang()) : '';
  });

  protected readonly subtitle = computed(() => {
    const step = this.store.currentStep();
    if (!step) return '';
    const max = this.maxIndex();
    return step.kind === 'generation'
      ? this.i18n.t('generation.numberOf', { index: step.index, max })
      : // Periods are numbered chronologically: the oldest is period 1.
        this.i18n.t('period.numberOf', { position: max - step.index + 1, total: max + 1 });
  });

  /** The current period's events, chronological. */
  protected readonly eventRows = computed(() => {
    this.places.version();
    const step = this.store.currentStep();
    if (step?.kind !== 'period') return [];
    return step.events.map((e) => ({
      id: e.id,
      year: e.year,
      people: e.people,
      kind: this.i18n.t(`event.${e.kind}`),
      where: e.event.place ?? '',
      // Only flag events that name a place we couldn't find; many have a date but no place.
      unlocated: !!e.event.place && !this.places.locate(e.event),
    }));
  });

  protected readonly rows = computed(() => {
    this.places.version();
    const lang = this.i18n.lang();
    const people = [...(this.store.currentStep()?.people ?? [])];
    people.sort((a, b) => a.surname.localeCompare(b.surname) || a.givenName.localeCompare(b.givenName));
    return people.map((person: Person) => {
      const loc = locatingEvent(person);
      return {
        person,
        lifespan: lifespan(person, lang),
        kind: loc ? this.i18n.t(`event.${loc.kind}`) : '',
        where: loc?.event.place ?? '',
        unlocated: !!loc && !this.places.locate(loc.event),
      };
    });
  });

  protected readonly located = computed(() => {
    this.places.version();
    const step = this.store.currentStep();
    if (step?.kind === 'period') {
      return { count: step.events.filter((e) => this.places.locate(e.event)).length };
    }
    const people = step?.people ?? [];
    let count = 0;
    for (const p of people) {
      const loc = locatingEvent(p);
      if (loc && this.places.locate(loc.event)) count++;
    }
    return { count };
  });

  protected move(delta: number): void {
    this.store.setStep(this.store.stepIndex() + delta);
  }

  protected onKey(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    if (event.key === 'ArrowLeft') this.move(1);
    if (event.key === 'ArrowRight') this.move(-1);
    if (event.key === ' ' && (event.target as HTMLElement).tagName !== 'BUTTON') {
      event.preventDefault();
      this.store.togglePlay();
    }
  }
}
