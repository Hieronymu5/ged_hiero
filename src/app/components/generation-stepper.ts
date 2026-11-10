import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { generationLabel } from '../core/ancestry';
import { lifespan, locatingEvent } from '../core/gedcom-parser';
import { Person } from '../core/gedcom.model';
import { PlacesService } from '../core/places.service';
import { TreeStore } from '../core/tree.store';

@Component({
  selector: 'app-generation-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown)': 'onKey($event)' },
  template: `
    @if (store.currentGeneration(); as gen) {
      <div class="stepper">
        <button type="button" class="icon-button" (click)="step(1)" [disabled]="gen.index >= maxIndex()"
                aria-label="Previous (older) generation" title="Older generation">‹</button>
        <div class="stepper-center">
          <strong>{{ label(gen.index) }}</strong>
          <span class="muted small">Generation {{ gen.index }} of {{ maxIndex() }}</span>
        </div>
        <button type="button" class="icon-button" (click)="step(-1)" [disabled]="gen.index <= 0"
                aria-label="Next (younger) generation" title="Younger generation">›</button>
      </div>
      <input type="range" class="gen-range" min="0" [max]="maxIndex()" [value]="maxIndex() - gen.index"
             (input)="store.setGeneration(maxIndex() - +$any($event.target).value)"
             aria-label="Generation (oldest on the left)" />

      <div class="stat-row">
        <div class="stat"><span class="stat-label">People</span><span class="stat-value">{{ gen.people.length }}</span></div>
        <div class="stat"><span class="stat-label">Possible</span><span class="stat-value">{{ gen.possible.toLocaleString() }}</span></div>
        <div class="stat"><span class="stat-label">On the map</span><span class="stat-value">{{ located().count }}</span></div>
      </div>

      <ul class="people">
        @for (row of rows(); track row.person.id) {
          <li (mouseenter)="hoverPerson.emit(row.person.id)" (mouseleave)="hoverPerson.emit(null)">
            <span class="sex" [attr.data-sex]="row.person.sex" aria-hidden="true"></span>
            <div class="person-text">
              <button type="button" class="link-button person-name" (click)="store.selectRoot(row.person.id)"
                      title="Show this person's ancestors">{{ row.person.fullName }}</button>
              <span class="muted small">
                {{ row.lifespan }}@if (row.lifespan && row.where) { · }
                @if (row.where) { {{ row.kind }} {{ row.where }} }
                @if (row.unlocated) { <span class="unlocated" title="Place not found on the map">· not on map</span> }
              </span>
            </div>
          </li>
        }
      </ul>
    }
  `,
})
export class GenerationStepper {
  protected readonly store = inject(TreeStore);
  private readonly places = inject(PlacesService);
  readonly hoverPerson = output<string | null>();
  protected readonly label = generationLabel;
  protected readonly maxIndex = computed(() => this.store.generations().length - 1);

  protected readonly rows = computed(() => {
    this.places.version();
    const people = [...(this.store.currentGeneration()?.people ?? [])];
    people.sort((a, b) => a.surname.localeCompare(b.surname) || a.givenName.localeCompare(b.givenName));
    return people.map((person: Person) => {
      const loc = locatingEvent(person);
      return {
        person,
        lifespan: lifespan(person),
        kind: loc?.kind ?? '',
        where: loc?.event.place ?? '',
        unlocated: !!loc && !this.places.locate(loc.event),
      };
    });
  });

  protected readonly located = computed(() => {
    this.places.version();
    const people = this.store.currentGeneration()?.people ?? [];
    let count = 0;
    for (const p of people) {
      const loc = locatingEvent(p);
      if (loc && this.places.locate(loc.event)) count++;
    }
    return { count };
  });

  protected step(delta: number): void {
    this.store.setGeneration(this.store.generationIndex() + delta);
  }

  protected onKey(event: KeyboardEvent): void {
    if ((event.target as HTMLElement).tagName === 'INPUT') return;
    if (event.key === 'ArrowLeft') this.step(1);
    if (event.key === 'ArrowRight') this.step(-1);
  }
}
