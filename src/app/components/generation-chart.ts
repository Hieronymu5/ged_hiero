import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, signal } from '@angular/core';
import {
  generationLabel,
  Period,
  PERIOD_EVENT_KINDS,
  PERIOD_YEARS,
  PeriodEventKind,
  stepCount,
  stepLabel,
} from '../core/ancestry';
import { LanguageService } from '../core/language.service';
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
        <h2>{{ heading().title }}</h2>
        <p class="muted small">{{ heading().subtitle }}</p>
      </div>
      <button type="button" class="link-button" (click)="showTable.set(!showTable())">
        {{ i18n.t(showTable() ? 'chart.showChart' : 'chart.showTable') }}
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
               (click)="store.setStep(bar.index)">
              <rect class="hit" [attr.x]="bar.slotX" [attr.y]="margin.top" [attr.width]="bar.slotW"
                    [attr.height]="layout().baseY - margin.top" />
              <path [attr.d]="bar.d" />
              @if (bar.showValue) {
                <text class="value" [attr.x]="bar.cx" [attr.y]="bar.y - 6" text-anchor="middle">{{ bar.count }}</text>
              }
              @if (bar.showTick) {
                <text class="tick" [attr.x]="bar.cx" [attr.y]="layout().baseY + 16" text-anchor="middle">{{ bar.tick }}</text>
              }
            </g>
          }
          <text class="axis-title" [attr.x]="margin.left" [attr.y]="height - 2">{{ heading().older }}</text>
          <text class="axis-title" [attr.x]="width - margin.right" [attr.y]="height - 2" text-anchor="end">{{ heading().newer }}</text>
        </svg>
        @if (tooltip(); as t) {
          <div class="tooltip" [style.left.%]="t.leftPct" [style.top.px]="0">
            <strong>{{ t.title }}</strong>
            @for (line of t.lines; track $index) { <span>{{ line }}</span> }
            @if (t.note) { <span class="muted">{{ t.note }}</span> }
          </div>
        }
      </div>
    } @else {
      <div class="table-wrap">
        <table>
          @if (store.mode() === 'generations') {
            <thead><tr><th>{{ i18n.t('table.gen') }}</th><th>{{ i18n.t('table.relation') }}</th><th class="num">{{ i18n.t('table.people') }}</th><th class="num">{{ i18n.t('table.possible') }}</th><th class="num">{{ i18n.t('table.complete') }}</th></tr></thead>
            <tbody>
              @for (g of store.generations(); track g.index) {
                <tr [class.selected]="g.index === store.stepIndex()" (click)="store.setStep(g.index)">
                  <td class="num">{{ g.index }}</td><td>{{ label(g.index) }}</td>
                  <td class="num">{{ g.people.length }}</td><td class="num">{{ i18n.number(g.possible) }}</td>
                  <td class="num">{{ pct(g.people.length, g.possible) }}</td>
                </tr>
              }
            </tbody>
          } @else {
            <thead><tr>
              <th>{{ i18n.t('table.period') }}</th>
              @for (kind of eventKinds; track kind) { <th class="num">{{ kindHeader(kind) }}</th> }
              <th class="num">{{ i18n.t('table.total') }}</th>
            </tr></thead>
            <tbody>
              @for (period of store.periods().periods; track period.index) {
                <tr [class.selected]="period.index === store.stepIndex()" (click)="store.setStep(period.index)">
                  <td>{{ stepLabel(period, i18n.lang()) }}</td>
                  @for (kind of eventKinds; track kind) { <td class="num">{{ kindCounts(period)[kind] }}</td> }
                  <td class="num">{{ period.events.length }}</td>
                </tr>
              }
            </tbody>
          }
        </table>
      </div>
    }
    @if (undatedNote(); as note) { <p class="muted small chart-note">{{ note }}</p> }
  `,
})
export class GenerationChart {
  protected readonly store = inject(TreeStore);
  protected readonly i18n = inject(LanguageService);
  protected readonly showTable = signal(false);
  protected readonly hover = signal<number | null>(null);
  /** Rendered width in px, so text stays at its real size on any screen. */
  protected readonly widthSignal = signal(640);
  protected get width(): number {
    return this.widthSignal();
  }
  protected readonly height = HEIGHT;
  protected readonly margin = MARGIN;
  protected readonly stepLabel = stepLabel;
  protected readonly eventKinds = PERIOD_EVENT_KINDS;

  protected kindHeader(kind: PeriodEventKind): string {
    return this.i18n.t(`table.${kind}`);
  }

  protected kindCounts(period: Period): Record<PeriodEventKind, number> {
    const counts = { born: 0, baptised: 0, married: 0, died: 0, buried: 0 };
    for (const e of period.events) counts[e.kind]++;
    return counts;
  }
  protected label(index: number): string {
    return generationLabel(index, this.i18n.lang());
  }

  protected readonly heading = computed(() => {
    const name = this.store.root()?.fullName ?? '';
    const t = this.i18n;
    return this.store.mode() === 'periods'
      ? {
          title: t.t('chart.periodTitle', { years: PERIOD_YEARS }),
          subtitle: t.t('chart.periodSubtitle', { name }),
          older: t.t('chart.periodOlder'),
          newer: t.t('chart.periodNewer'),
        }
      : {
          title: t.t('chart.title'),
          subtitle: t.t('chart.subtitle', { name }),
          older: t.t('chart.older'),
          newer: t.t('chart.selected'),
        };
  });

  /** Ancestors left out of the period view because they have no birth or baptism year. */
  protected readonly undatedNote = computed(() => {
    if (this.store.mode() !== 'periods') return '';
    const count = this.store.periods().undated.length;
    return count ? this.i18n.t('period.undated', { count }) : '';
  });

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
    const p = count / possible;
    const digits = p >= 0.1 || p === 0 ? { maximumFractionDigits: 0 } : { maximumSignificantDigits: 2 };
    return this.i18n.number(p, { style: 'percent', ...digits });
  }

  protected readonly layout = computed(() => {
    const gens = this.store.steps();
    const selected = this.store.stepIndex();
    const maxCount = Math.max(1, ...gens.map(stepCount));
    const step = niceStep(maxCount);
    const top = Math.ceil(maxCount / step) * step;
    const baseY = HEIGHT - MARGIN.bottom;
    const plotH = baseY - MARGIN.top;
    const y = (v: number) => baseY - (v / top) * plotH;
    const width = this.widthSignal();
    const plotW = width - MARGIN.left - MARGIN.right;
    const slotW = plotW / Math.max(1, gens.length);
    const barW = Math.max(2, Math.min(MAX_BAR, slotW - 2));
    // Year labels ("1850") need more room than generation numbers.
    const minTickSpace = this.store.mode() === 'periods' ? 36 : 18;
    const tickEvery = slotW >= minTickSpace ? 1 : Math.ceil(minTickSpace / slotW);
    const peakIndex = gens.reduce((best, g) => (stepCount(g) > stepCount(gens[best]) ? g.index : best), 0);
    const bars = gens.map((g, i) => {
      // Oldest step on the left: position = (last - index).
      const slot = gens.length - 1 - i;
      const slotX = MARGIN.left + slot * slotW;
      const cx = slotX + slotW / 2;
      const count = stepCount(g);
      const by = y(count);
      return {
        index: g.index,
        count,
        slotX,
        slotW,
        cx,
        y: by,
        d: barPath(cx - barW / 2, by, barW, baseY - by),
        selected: g.index === selected,
        showValue: g.index === selected || g.index === peakIndex,
        showTick: g.index % tickEvery === 0 || g.index === selected,
        tick: g.kind === 'period' ? g.start : g.index,
      };
    });
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push({ value: v, y: y(v), label: this.i18n.number(v) });
    return { bars, ticks, baseY };
  });

  protected readonly tooltip = computed(() => {
    const index = this.hover();
    if (index === null) return null;
    const g = this.store.steps()[index];
    const bar = this.layout().bars[index];
    if (!g || !bar) return null;
    const count = stepCount(g);
    let lines: string[];
    let note = '';
    if (g.kind === 'generation') {
      const repeats = g.slots - count;
      lines = [
        this.i18n.t('generation.number', { index }),
        this.i18n.t('chart.tooltipCount', { count, possible: g.possible, pct: this.pct(count, g.possible) }),
      ];
      if (repeats > 0) note = this.i18n.t('chart.collapse', { repeats });
    } else {
      const counts = this.kindCounts(g);
      lines = [this.i18n.t('chart.periodCount', { count })];
      const breakdown = PERIOD_EVENT_KINDS.filter((k) => counts[k])
        .map((k) => `${counts[k]} ${this.i18n.t(`event.${k}`)}`)
        .join(' · ');
      if (breakdown) note = breakdown;
    }
    return {
      title: stepLabel(g, this.i18n.lang()),
      lines,
      note,
      leftPct: Math.min(60, Math.max(0, (bar.cx / this.widthSignal()) * 100 - 10)),
    };
  });

  protected readonly ariaLabel = computed(() => {
    if (this.store.mode() === 'periods') {
      const periods = this.store.periods().periods;
      const list = periods.map((p) => `${stepLabel(p, this.i18n.lang())}: ${p.events.length}`).join(', ');
      return this.i18n.t('chart.periodAria', { years: PERIOD_YEARS, count: periods.length, list });
    }
    const gens = this.store.generations();
    const list = gens
      .map((g) => this.i18n.t('chart.ariaItem', { index: g.index, count: g.people.length }))
      .join(', ');
    return this.i18n.t('chart.aria', { depth: gens.length - 1, list });
  });
}
