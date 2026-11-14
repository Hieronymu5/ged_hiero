import { Injectable, computed, signal } from '@angular/core';
import { buildGenerations, buildPeriods, childLinks, lineageLinks, Step } from './ancestry';
import { decodeGedcom, parseGedcom } from './gedcom-parser';
import { GedcomTree, Person } from './gedcom.model';
import { LocalizedText, translate } from './messages';

/** An error whose message is translated when shown, so it follows language switches. */
class LocalizedError extends Error {
  constructor(readonly text: LocalizedText) {
    super(text('en'));
  }
}

/** How the timeline is divided: by generation, or by 50-year period of birth. */
export type StepMode = 'generations' | 'periods';
const MODE_KEY = 'ged-hiero-step-mode';

function readMode(): StepMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'periods' ? 'periods' : 'generations';
  } catch {
    return 'generations';
  }
}

@Injectable({ providedIn: 'root' })
export class TreeStore {
  readonly tree = signal<GedcomTree | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly error = signal<LocalizedText | null>(null);
  readonly loading = signal(false);
  readonly rootId = signal<string | null>(null);
  readonly mode = signal<StepMode>(readMode());
  /** Position in `steps()`: 0 = the selected person / most recent period, higher = older. */
  readonly stepIndex = signal(0);
  /** True while the steps are being animated (oldest -> most recent). */
  readonly playing = signal(false);
  private playTimer?: ReturnType<typeof setInterval>;

  readonly root = computed(() => {
    const id = this.rootId();
    return id ? (this.tree()?.people.get(id) ?? null) : null;
  });

  readonly generations = computed(() => {
    const tree = this.tree();
    const id = this.rootId();
    return tree && id ? buildGenerations(tree, id) : [];
  });

  /** Dated events of the selected person and all ancestors, grouped into periods. */
  readonly periods = computed(() => {
    const tree = this.tree();
    return tree ? buildPeriods(tree, this.generations()) : { periods: [], undated: [] };
  });

  readonly steps = computed<Step[]>(() =>
    this.mode() === 'periods' ? this.periods().periods : this.generations(),
  );

  readonly currentStep = computed(() => this.steps()[this.stepIndex()] ?? null);

  private readonly allLinks = computed(() => {
    const tree = this.tree();
    return tree ? lineageLinks(tree, this.generations()) : [];
  });

  /**
   * Parent -> child pairs to draw for a step. Generations: from each person to their child.
   * Periods: for each birth or baptism in the period, the child's parents.
   */
  childLinksFor(step: Step): { parent: Person; child: Person }[] {
    const tree = this.tree();
    if (!tree) return [];
    if (step.kind === 'generation') return childLinks(tree, this.generations(), step.index);
    const born = new Set(
      step.events
        .filter((e) => e.kind === 'born' || e.kind === 'baptised')
        .map((e) => e.people[0].id),
    );
    return this.allLinks().filter((l) => born.has(l.child.id));
  }

  setMode(mode: StepMode): void {
    if (mode === this.mode()) return;
    this.pause();
    this.mode.set(mode);
    this.stepIndex.set(0);
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* not persisted */
    }
  }

  async load(file: File): Promise<void> {
    return this.loadBuffer(file.name, () => file.arrayBuffer());
  }

  async loadSample(): Promise<void> {
    return this.loadBuffer('sample.ged', async () => {
      const res = await fetch('samples/sample.ged');
      if (!res.ok) throw new LocalizedError((l) => translate(l, 'error.sampleHttp', { status: res.status }));
      return res.arrayBuffer();
    });
  }

  private async loadBuffer(name: string, read: () => Promise<ArrayBuffer>): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { text, encoding } = decodeGedcom(await read());
      const tree = parseGedcom(text, encoding);
      if (!tree.people.size) throw new LocalizedError((l) => translate(l, 'error.noPeople'));
      this.tree.set(tree);
      this.fileName.set(name);
      this.rootId.set(null);
      this.stepIndex.set(0);
    } catch (err) {
      if (err instanceof LocalizedError) this.error.set(err.text);
      else {
        const message = err instanceof Error ? err.message : String(err);
        this.error.set(() => message);
      }
    } finally {
      this.loading.set(false);
    }
  }

  selectRoot(id: string): void {
    this.pause();
    this.rootId.set(id);
    this.stepIndex.set(0);
  }

  /** User navigation: stops any running animation. */
  setStep(index: number): void {
    this.pause();
    this.moveTo(index);
  }

  private moveTo(index: number): void {
    const max = this.steps().length - 1;
    this.stepIndex.set(Math.max(0, Math.min(max, index)));
  }

  /**
   * Steps from the current step toward the most recent one (the selected person), one per tick.
   * Starting at the most recent step restarts from the oldest.
   */
  play(intervalMs = 1300): void {
    const last = this.steps().length - 1;
    if (last < 1) return;
    this.pause();
    if (this.stepIndex() === 0) this.moveTo(last);
    this.playing.set(true);
    this.playTimer = setInterval(() => {
      const next = this.stepIndex() - 1;
      this.moveTo(next);
      if (next <= 0) this.pause();
    }, intervalMs);
  }

  pause(): void {
    clearInterval(this.playTimer);
    this.playTimer = undefined;
    this.playing.set(false);
  }

  togglePlay(): void {
    if (this.playing()) this.pause();
    else this.play();
  }

  reset(): void {
    this.pause();
    this.tree.set(null);
    this.fileName.set(null);
    this.rootId.set(null);
    this.stepIndex.set(0);
  }
}
