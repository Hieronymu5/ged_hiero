import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import { generationLabel } from '../core/ancestry';
import { TreeStore } from '../core/tree.store';

const HEIGHT = 220;
const MARGIN = { top: 20, right: 8, bottom: 36, left: 40 };
const MAX_BAR = 24;

function niceStep(max: number, count = 4): number {
  const raw = Math.max(1, max) / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  return Math.max(1, step);
}

/** Rounded top corners (4px), square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

@Component({
  selector: 'app-generation-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-head">
      <div>
        <h2>People per generation</h2>
        <p class="muted small">Oldest generation on the left, leading up to {{ store.root()?.fullName }}</p>
      </div>
      <button type="button" class="link-button" (click)="showTable.set(!showTable())">
        {{ showTable() ? 'Show chart' : 'Show table' }}
      </button>
    </div>

    @if (!showTable()) {
      <div class="chart-wrap" (mouseleave)="hover.set(null)">
        <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" class="chart" role="img"
             [attr.aria-label]="ariaLabel()">
          @for (tick of layout().ticks; track tick.value) {
            <line class="grid" [attr.x1]="margin.left" [attr.x2]="width - margin.right"
                  [attr.y1]="tick.y" [attr.y2]="tick.y" />
            <text class="tick" [attr.x]="margin.left - 6" [attr.y]="tick.y" text-anchor="end" dominant-baseline="middle">
              {{ tick.label }}
            </text>
          }
          <line class="baseline" [attr.x1]="margin.left" [attr.x2]="width - margin.right"
                [attr.y1]="layout().baseY" [attr.y2]="layout().baseY" />
          @for (bar of layout().bars; track bar.index) {
            <g class="bar" [class.selected]="bar.selected" (mouseenter)="hover.set(bar.index)"
               (click)="store.setGeneration(bar.index)">
              <rect class="hit" [attr.x]="bar.slotX" [attr.y]="margin.top" [attr.width]="bar.slotW"
                    [attr.height]="layout().baseY - margin.top" />
              <path [attr.d]="bar.d" />
              @if (bar.showValue) {
                <text class="value" [attr.x]="bar.cx" [attr.y]="bar.y - 6" text-anchor="middle">{{ bar.count }}</text>
              }
              @if (bar.showTick) {
                <text class="tick" [attr.x]="bar.cx" [attr.y]="layout().baseY + 16" text-anchor="middle">{{ bar.index }}</text>
              }
            </g>
          }
          <text class="axis-title" [attr.x]="margin.left" [attr.y]="height - 2">← older generations</text>
          <text class="axis-title" [attr.x]="width - margin.right" [attr.y]="height - 2" text-anchor="end">selected person</text>
        </svg>
        @if (tooltip(); as t) {
          <div class="tooltip" [style.left.%]="t.leftPct" [style.top.px]="0">
            <strong>{{ t.title }}</strong>
            <span>Generation {{ t.index }}</span>
            <span>{{ t.count }} {{ t.count === 1 ? 'person' : 'people' }} of {{ t.possible.toLocaleString() }} possible ({{ t.pct }})</span>
            @if (t.collapse) { <span class="muted">{{ t.collapse }}</span> }
          </div>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table>
          <thead><tr><th>Gen</th><th>Relation</th><th class="num">People</th><th class="num">Possible</th><th class="num">Complete</th></tr></thead>
          <tbody>
            @for (g of store.generations(); track g.index) {
              <tr [class.selected]="g.index === store.generationIndex()" (click)="store.setGeneration(g.index)">
                <td class="num">{{ g.index }}</td><td>{{ label(g.index) }}</td>
                <td class="num">{{ g.people.length }}</td><td class="num">{{ g.possible.toLocaleString() }}</td>
                <td class="num">{{ pct(g.people.length, g.possible) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class GenerationChart {
  protected readonly store = inject(TreeStore);
  protected readonly showTable = signal(false);
  protected readonly hover = signal<number | null>(null);
  /** Rendered width in px, so text stays at its real size on any screen. */
  protected readonly widthSignal = signal(640);
  protected get width(): number {
    return this.widthSignal();
  }
  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly label = generationLabel;

  constructor() {
    const host = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      if (w > 0) this.widthSignal.set(Math.max(280, w));
    });
    observer.observe(host);
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  protected pct(count: number, possible: number): string {
    const p = (count / possible) * 100;
    return p >= 10 || p === 0 ? `${Math.round(p)}%` : `${p.toPrecision(2)}%`;
  }

  protected readonly layout = computed(() => {
    const gens = this.store.generations();
    const selected = this.store.generationIndex();
    const maxCount = Math.max(1, ...gens.map((g) => g.people.length));
    const step = niceStep(maxCount);
    const top = Math.ceil(maxCount / step) * step;
    const baseY = HEIGHT - MARGIN.bottom;
    const plotH = baseY - MARGIN.top;
    const y = (v: number) => baseY - (v / top) * plotH;
    const width = this.widthSignal();
    const plotW = width - MARGIN.left - MARGIN.right;
    const slotW = plotW / Math.max(1, gens.length);
    const barW = Math.max(2, Math.min(MAX_BAR, slotW - 2));
    const tickEvery = slotW >= 18 ? 1 : Math.ceil(18 / slotW);
    const peakIndex = gens.reduce((best, g) => (g.people.length > gens[best].people.length ? g.index : best), 0);
    const bars = gens.map((g, i) => {
      // Oldest generation on the left: position = (last - index).
      const slot = gens.length - 1 - i;
      const slotX = MARGIN.left + slot * slotW;
      const cx = slotX + slotW / 2;
      const by = y(g.people.length);
      return {
        index: g.index,
        count: g.people.length,
        slotX,
        slotW,
        cx,
        y: by,
        d: barPath(cx - barW / 2, by, barW, baseY - by),
        selected: g.index === selected,
        showValue: g.index === selected || g.index === peakIndex,
        showTick: g.index % tickEvery === 0 || g.index === selected,
      };
    });
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push({ value: v, y: y(v), label: v.toLocaleString() });
    return { bars, ticks, baseY };
  });

  protected readonly tooltip = computed(() => {
    const index = this.hover();
    if (index === null) return null;
    const g = this.store.generations()[index];
    const bar = this.layout().bars[index];
    if (!g || !bar) return null;
    const repeats = g.slots - g.people.length;
    return {
      index,
      title: generationLabel(index),
      count: g.people.length,
      possible: g.possible,
      pct: this.pct(g.people.length, g.possible),
      collapse: repeats > 0 ? `${repeats} ancestor slot${repeats === 1 ? '' : 's'} filled by the same person (pedigree collapse)` : '',
      leftPct: Math.min(60, Math.max(0, (bar.cx / this.widthSignal()) * 100 - 10)),
    };
  });

  protected readonly ariaLabel = computed(() => {
    const gens = this.store.generations();
    return `Column chart of people per generation, ${gens.length - 1} generations back. ` +
      gens.map((g) => `Generation ${g.index}: ${g.people.length}`).join(', ');
  });
}
