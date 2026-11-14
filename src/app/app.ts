import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AncestryMap } from './components/ancestry-map';
import { FileUpload } from './components/file-upload';
import { GenerationChart } from './components/generation-chart';
import { GenerationStepper } from './components/generation-stepper';
import { LanguageSwitcher } from './components/language-switcher';
import { PersonSearch } from './components/person-search';
import { ThemeToggle } from './components/theme-toggle';
import { ZoomIndicator } from './components/zoom-indicator';
import { lifespan } from './core/gedcom-parser';
import { LanguageService } from './core/language.service';
import { TreeStore } from './core/tree.store';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AncestryMap, FileUpload, GenerationChart, GenerationStepper, LanguageSwitcher, PersonSearch, ThemeToggle, ZoomIndicator,
  ],
  templateUrl: './app.html',
})
export class App {
  protected readonly store = inject(TreeStore);
  protected readonly i18n = inject(LanguageService);
  protected readonly hoverPersonId = signal<string | null>(null);
  protected readonly rootLifespan = computed(() => {
    const root = this.store.root();
    return root ? lifespan(root, this.i18n.lang()) : '';
  });
  protected readonly depth = computed(() => Math.max(0, this.store.generations().length - 1));
  protected readonly totalAncestors = computed(() => {
    const ids = new Set<string>();
    for (const g of this.store.generations().slice(1)) for (const p of g.people) ids.add(p.id);
    return ids.size;
  });
}
