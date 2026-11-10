import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { geoMercator, geoPath, GeoProjection } from 'd3-geo';
import { select } from 'd3-selection';
import { zoom, ZoomBehavior, zoomIdentity, ZoomTransform } from 'd3-zoom';
import { feature, mesh } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { childLinks, generationLabel } from '../core/ancestry';
import { COUNTRIES, COUNTRY_BBOX } from '../core/countries';
import { lifespan, locatingEvent } from '../core/gedcom-parser';
import { Person } from '../core/gedcom.model';
import { GeoPoint } from '../core/geocoder';
import { PlacesService } from '../core/places.service';
import { TreeStore } from '../core/tree.store';
import { normalizeText } from '../core/text';

const WIDTH = 800;
const HEIGHT = 720;
const PAD = 40;
/** Minimum span (degrees) the view is fitted to, so a single village isn't zoomed absurdly far. */
const MIN_SPAN = 1.6;

interface CountryLayer {
  code: string;
  municipalities: string;
  provinces: string;
  outline: string;
  lakes: string;
}

interface LocatedPerson {
  person: Person;
  point: GeoPoint;
  place: string;
  kind: string;
}

const topoCache = new Map<string, Promise<Topology>>();
function loadTopology(path: string): Promise<Topology> {
  let pending = topoCache.get(path);
  if (!pending) {
    pending = fetch(path).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json() as Promise<Topology>;
    });
    pending.catch(() => topoCache.delete(path));
    topoCache.set(path, pending);
  }
  return pending;
}

function countryOf(point: GeoPoint): string | undefined {
  if (point.country) return point.country;
  return Object.entries(COUNTRY_BBOX).find(
    ([, [w, s, e, n]]) => point.lon >= w && point.lon <= e && point.lat >= s && point.lat <= n,
  )?.[0];
}

const SHOW_CHILDREN_KEY = 'ged-hiero-show-children';
const GIF_HEADER = 64;

function readShowChildren(): boolean {
  try {
    return localStorage.getItem(SHOW_CHILDREN_KEY) !== 'false';
  } catch {
    return true;
  }
}

function slug(text: string): string {
  return normalizeText(text).replace(/\s+/g, '-') || 'tree';
}

type Colors = Record<
  'surface' | 'text' | 'text2' | 'muted' | 'accent' | 'accentSoft' | 'child' | 'water' | 'land' | 'landDetail' | 'municipality' | 'province' | 'countryBorder',
  string
>;

/** Resolves the theme's CSS custom properties so the GIF matches what's on screen. */
function readColors(): Colors {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string) => style.getPropertyValue(name).trim();
  return {
    surface: v('--surface'), text: v('--text'), text2: v('--text-2'), muted: v('--muted'),
    accent: v('--accent'), accentSoft: v('--accent-soft'), child: v('--child'), water: v('--water'),
    land: v('--land'), landDetail: v('--land-detail'), municipality: v('--municipality'),
    province: v('--province'), countryBorder: v('--country-border'),
  };
}

interface FrameInput {
  base: { world: string; worldBorders: string; countries: CountryLayer[] };
  layers: {
    ghosts: { x: number; y: number }[];
    dots: { x: number; y: number; r: number }[];
    links: { x1: number; y1: number; x2: number; y2: number }[];
    children: { x: number; y: number }[];
  };
  transform: ZoomTransform;
  showChildren: boolean;
  colors: Colors;
  index: number;
  /** People per generation, by generation index. */
  generations: number[];
  rootName: string;
}

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

function drawFrame(ctx: CanvasRenderingContext2D, f: FrameInput): void {
  const { colors: c, transform: t } = f;
  const W = WIDTH;
  ctx.save();
  ctx.fillStyle = c.surface;
  ctx.fillRect(0, 0, W, HEIGHT + GIF_HEADER);

  // Header: generation title, count, and a mini per-generation column chart (oldest left).
  const count = f.generations[f.index];
  ctx.fillStyle = c.text;
  ctx.font = `600 20px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(generationLabel(f.index), 16, 28);
  ctx.fillStyle = c.text2;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(
    `Generation ${f.index} · ${count} ${count === 1 ? 'person' : 'people'} · ancestors of ${f.rootName}`,
    16, 50,
  );
  const n = f.generations.length;
  const chartW = Math.min(220, n * 14);
  const slot = chartW / n;
  const barW = Math.max(2, Math.min(10, slot - 2));
  const max = Math.max(1, ...f.generations);
  const chartX = W - 16 - chartW;
  for (let i = 0; i < n; i++) {
    const h = Math.max(1, (f.generations[i] / max) * 40);
    const x = chartX + (n - 1 - i) * slot + (slot - barW) / 2;
    ctx.fillStyle = i === f.index ? c.accent : c.accentSoft;
    ctx.fillRect(x, 52 - h, barW, h);
  }

  // Map, clipped to its frame, with the on-screen zoom applied.
  ctx.translate(0, GIF_HEADER);
  ctx.beginPath();
  ctx.rect(0, 0, W, HEIGHT);
  ctx.clip();
  ctx.fillStyle = c.water;
  ctx.fillRect(0, 0, W, HEIGHT);
  ctx.translate(t.x, t.y);
  ctx.scale(t.k, t.k);
  const px = (v: number) => v / t.k;
  const stroke = (d: string, color: string, width: number) => {
    if (!d) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = px(width);
    ctx.stroke(new Path2D(d));
  };
  const fill = (d: string, color: string) => {
    if (!d) return;
    ctx.fillStyle = color;
    ctx.fill(new Path2D(d));
  };
  const circle = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  };

  fill(f.base.world, c.land);
  for (const country of f.base.countries) {
    fill(country.outline, c.landDetail);
    stroke(country.municipalities, c.municipality, 0.5);
    fill(country.lakes, c.water);
    stroke(country.provinces, c.province, 0.9);
    stroke(country.outline, c.countryBorder, 1.3);
  }
  stroke(f.base.worldBorders, c.province, 0.6);

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = c.muted;
  for (const g of f.layers.ghosts) {
    circle(g.x, g.y, px(2.5));
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (f.showChildren) {
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = px(1.2);
    for (const l of f.layers.links) {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const ch of f.layers.children) {
      circle(ch.x, ch.y, px(3.5));
      ctx.fillStyle = c.child;
      ctx.fill();
      ctx.strokeStyle = c.surface;
      ctx.lineWidth = px(1);
      ctx.stroke();
    }
  }

  for (const d of f.layers.dots) {
    circle(d.x, d.y, px(d.r));
    ctx.fillStyle = c.accent;
    ctx.fill();
    ctx.strokeStyle = c.surface;
    ctx.lineWidth = px(2);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = c.muted;
  ctx.font = `10px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('Boundaries © geoBoundaries · Natural Earth · Places © GeoNames', W - 8, GIF_HEADER + HEIGHT - 8);
  ctx.textAlign = 'left';
}

@Component({
  selector: 'app-ancestry-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="map-frame" #frame>
      <svg #svg class="map" [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="xMidYMid meet"
           role="img" [attr.aria-label]="ariaLabel()">
        <g [attr.transform]="transformAttr()">
          <path class="world" [attr.d]="base().world" />
          @for (c of base().countries; track c.code) {
            <path class="land-detail" [attr.d]="c.outline" />
            <path class="municipality" [attr.d]="c.municipalities" />
            <path class="lake" [attr.d]="c.lakes" />
            <path class="province" [attr.d]="c.provinces" />
            <path class="country-border" [attr.d]="c.outline" />
          }
          <path class="world-border" [attr.d]="base().worldBorders" />

          @for (p of ghosts(); track p.key) {
            <circle class="ghost" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="2.5 / k()" />
          }
          @if (showChildren()) {
            @for (l of links(); track l.key) {
              <line class="link" [attr.x1]="l.x1" [attr.y1]="l.y1" [attr.x2]="l.x2" [attr.y2]="l.y2" />
            }
            @for (c of children(); track c.key) {
              <circle class="child-dot" [attr.cx]="c.x" [attr.cy]="c.y" [attr.r]="3.5 / k()" />
            }
          }
          @for (d of dots(); track d.key) {
            <circle class="dot" [class.highlight]="d.highlight" [attr.cx]="d.x" [attr.cy]="d.y"
                    [attr.r]="d.r / k()" [attr.stroke-width]="2 / k()"
                    (mouseenter)="onDotEnter($event, d.key)" (mouseleave)="hoverDot.set(null)"
                    (focus)="hoverDot.set(d.key)" (blur)="hoverDot.set(null)" tabindex="0"
                    [attr.aria-label]="d.place + ': ' + d.people.length + ' people'" />
          }
        </g>
      </svg>

      <div class="map-controls">
        <button type="button" class="icon-button" (click)="zoomBy(1.6)" aria-label="Zoom in">+</button>
        <button type="button" class="icon-button" (click)="zoomBy(1 / 1.6)" aria-label="Zoom out">−</button>
        <button type="button" class="icon-button" (click)="resetZoom()" aria-label="Fit to ancestors" title="Fit">⤢</button>
      </div>

      @if (status(); as s) { <div class="map-status">{{ s }}</div> }

      @if (tooltip(); as t) {
        <div class="tooltip map-tooltip" [style.left.px]="t.x" [style.top.px]="t.y">
          <strong>{{ t.place }}</strong>
          @for (row of t.rows; track row.id) {
            <span>{{ row.name }} <span class="muted">{{ row.detail }}</span></span>
          }
          @if (t.more) { <span class="muted">+{{ t.more }} more</span> }
        </div>
      }
    </div>
    <div class="map-toolbar small">
      <div class="map-legend">
        <span><i class="key key-dot"></i>{{ label() }}</span>
        @if (showChildren()) { <span><i class="key key-child"></i>their children</span> }
        <span><i class="key key-ghost"></i>other ancestors</span>
      </div>
      <div class="map-actions">
        <label class="check">
          <input type="checkbox" [checked]="showChildren()" (change)="setShowChildren($any($event.target).checked)" />
          Show children
        </label>
        <select [value]="gifOrder()" (change)="gifOrder.set($any($event.target).value)" aria-label="Animation order"
                [disabled]="!!exporting()">
          <option value="oldest-first">Oldest → selected person</option>
          <option value="root-first">Selected person → oldest</option>
        </select>
        <button type="button" class="button" (click)="exportGif()" [disabled]="!!exporting()">
          {{ exporting() ?? 'Save as GIF' }}
        </button>
      </div>
    </div>
    @if (exportError(); as e) { <p class="error small map-note">{{ e }}</p> }
    <p class="attribution">
      Boundaries © geoBoundaries (PDOK CC0, Statbel ODbL, BKG dl-de/by-2-0) · Natural Earth · Places © GeoNames (CC BY 4.0)
    </p>
  `,
})
export class AncestryMap {
  readonly highlightPersonId = input<string | null>(null);

  private readonly store = inject(TreeStore);
  private readonly places = inject(PlacesService);
  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svg');
  private readonly frameRef = viewChild.required<ElementRef<HTMLDivElement>>('frame');

  protected readonly width = WIDTH;
  protected readonly height = HEIGHT;
  protected readonly transform = signal<ZoomTransform>(zoomIdentity);
  protected readonly k = computed(() => this.transform().k);
  protected readonly transformAttr = computed(() => this.transform().toString());
  protected readonly hoverDot = signal<string | null>(null);
  private readonly hoverPos = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  private readonly loadingPlaces = signal(false);
  private readonly world = signal<Topology | null>(null);
  private readonly countryTopos = signal<Map<string, Topology>>(new Map());
  private zoomBehavior?: ZoomBehavior<SVGSVGElement, unknown>;

  protected readonly showChildren = signal(readShowChildren());
  protected readonly gifOrder = signal<'oldest-first' | 'root-first'>('oldest-first');
  /** Progress label while a GIF is being rendered, null when idle. */
  protected readonly exporting = signal<string | null>(null);
  protected readonly exportError = signal<string | null>(null);

  protected readonly label = computed(() => generationLabel(this.store.generationIndex()));

  /** Every ancestor (all generations) with a resolvable location. */
  private readonly located = computed(() => {
    this.places.version();
    const byId = new Map<string, LocatedPerson>();
    for (const gen of this.store.generations()) {
      for (const person of gen.people) {
        if (byId.has(person.id)) continue;
        const loc = locatingEvent(person);
        const point = loc && this.places.locate(loc.event);
        if (loc && point) byId.set(person.id, { person, point, place: loc.event.place ?? '', kind: loc.kind });
      }
    }
    return byId;
  });

  private readonly neededCountries = computed(() => {
    const codes = new Set<string>();
    for (const { point } of this.located().values()) {
      const code = countryOf(point);
      if (code) codes.add(code);
    }
    return codes.size ? [...codes] : COUNTRIES.map((c) => c.code);
  });

  private readonly projection = computed<GeoProjection>(() => {
    const pts = [...this.located().values()].map((l) => [l.point.lon, l.point.lat]);
    const projection = geoMercator();
    const extent: [[number, number], [number, number]] = [[PAD, PAD], [WIDTH - PAD, HEIGHT - PAD]];
    if (pts.length) {
      let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const [x, y] of pts) {
        w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
      }
      const cx = (w + e) / 2, cy = (s + n) / 2;
      const hw = Math.max(e - w, MIN_SPAN) / 2, hh = Math.max(n - s, MIN_SPAN / 1.6) / 2;
      projection.fitExtent(extent, {
        type: 'MultiPoint',
        coordinates: [[cx - hw, cy - hh], [cx + hw, cy + hh]],
      });
    } else {
      const boxes = this.neededCountries().map((c) => COUNTRY_BBOX[c]).filter(Boolean);
      const coords = boxes.flatMap(([w, s, e, n]) => [[w, s], [e, n]]);
      projection.fitExtent(extent, { type: 'MultiPoint', coordinates: coords });
    }
    return projection;
  });

  protected readonly base = computed(() => {
    const path = geoPath(this.projection());
    const world = this.world();
    const detailed = new Set(this.neededCountries());
    const countries: CountryLayer[] = [];
    for (const [code, topo] of this.countryTopos()) {
      if (!detailed.has(code)) continue;
      const o = topo.objects as Record<string, any>;
      countries.push({
        code,
        outline: path(feature(topo, o['outline']) as unknown as FeatureCollection) ?? '',
        municipalities: path(mesh(topo, o['municipalities'], (a, b) => a !== b)) ?? '',
        provinces: path(mesh(topo, o['provinces'], (a, b) => a !== b)) ?? '',
        lakes: o['lakes'] ? (path(feature(topo, o['lakes']) as unknown as FeatureCollection) ?? '') : '',
      });
    }
    let worldPath = '';
    let worldBorders = '';
    if (world) {
      const o = world.objects as Record<string, any>;
      worldPath = path(feature(world, o['land']) as unknown as Feature<Geometry>) ?? '';
      worldBorders = path(mesh(world, o['countries'], (a, b) => a !== b)) ?? '';
    }
    return { world: worldPath, worldBorders, countries };
  });

  private project(point: GeoPoint): [number, number] | null {
    return this.projection()([point.lon, point.lat]);
  }

  /** Dots, ghosts, child links and child dots for one generation (used on screen and for GIF frames). */
  private layersFor(index: number, highlight: string | null) {
    const located = this.located();
    const generations = this.store.generations();
    const tree = this.store.tree();
    const people = generations[index]?.people ?? [];
    const currentIds = new Set(people.map((p) => p.id));

    const seen = new Set<string>();
    const ghosts: { key: string; x: number; y: number }[] = [];
    for (const l of located.values()) {
      if (currentIds.has(l.person.id)) continue;
      const xy = this.project(l.point);
      if (!xy) continue;
      const key = `${xy[0].toFixed(1)},${xy[1].toFixed(1)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      ghosts.push({ key, x: xy[0], y: xy[1] });
    }

    const groups = new Map<string, { key: string; x: number; y: number; place: string; people: LocatedPerson[] }>();
    for (const person of people) {
      const l = located.get(person.id);
      const xy = l && this.project(l.point);
      if (!l || !xy) continue;
      const key = `${l.point.lat},${l.point.lon}`;
      const group = groups.get(key) ?? { key, x: xy[0], y: xy[1], place: l.place.split(',')[0], people: [] };
      group.people.push(l);
      groups.set(key, group);
    }
    const dots = [...groups.values()]
      .map((g) => ({
        ...g,
        r: 4.5 + Math.sqrt(g.people.length - 1) * 2.5,
        highlight: !!highlight && g.people.some((p) => p.person.id === highlight),
      }))
      .sort((a, b) => b.r - a.r);

    // Lines from each ancestor in this generation to where their child was born.
    const links: { key: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    if (tree) {
      for (const { parent, child } of childLinks(tree, generations, index)) {
        const a = located.get(parent.id);
        const b = located.get(child.id);
        const p1 = a && this.project(a.point);
        const p2 = b && this.project(b.point);
        if (!p1 || !p2 || (p1[0] === p2[0] && p1[1] === p2[1])) continue;
        links.push({ key: `${parent.id}>${child.id}`, x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
      }
    }

    const children = new Map<string, { key: string; x: number; y: number }>();
    if (index > 0) {
      for (const person of generations[index - 1]?.people ?? []) {
        const l = located.get(person.id);
        const xy = l && this.project(l.point);
        if (xy) children.set(`${xy[0]},${xy[1]}`, { key: `${xy[0]},${xy[1]}`, x: xy[0], y: xy[1] });
      }
    }
    return { ghosts, dots, links, children: [...children.values()] };
  }

  private readonly layers = computed(() =>
    this.layersFor(this.store.generationIndex(), this.highlightPersonId()),
  );
  protected readonly ghosts = computed(() => this.layers().ghosts);
  protected readonly dots = computed(() => this.layers().dots);
  protected readonly links = computed(() => this.layers().links);
  protected readonly children = computed(() => this.layers().children);

  protected readonly tooltip = computed(() => {
    const key = this.hoverDot();
    const dot = key && this.dots().find((d) => d.key === key);
    if (!dot) return null;
    const max = 8;
    const { x, y } = this.hoverPos();
    return {
      x,
      y,
      place: dot.people[0].place || dot.place,
      rows: dot.people.slice(0, max).map((p) => ({
        id: p.person.id,
        name: p.person.fullName,
        detail: [p.kind, lifespan(p.person)].filter(Boolean).join(' · '),
      })),
      more: Math.max(0, dot.people.length - max),
    };
  });

  protected readonly status = computed(() => {
    if (this.loadingPlaces()) return 'Looking up places…';
    const gen = this.store.currentGeneration();
    if (gen && !this.dots().length) return 'No mappable places in this generation';
    return null;
  });

  protected readonly ariaLabel = computed(
    () => `Map of ${this.label().toLowerCase()}: ${this.dots().map((d) => `${d.place} (${d.people.length})`).join(', ')}`,
  );

  constructor() {
    loadTopology('data/maps/world-50m.json').then((t) => this.world.set(t), () => undefined);

    // Load gazetteers for every place among the ancestors whenever the root changes.
    effect(() => {
      const placeStrings = new Set<string>();
      for (const gen of this.store.generations()) {
        for (const person of gen.people) {
          const place = locatingEvent(person)?.event.place;
          if (place) placeStrings.add(place);
        }
      }
      if (!placeStrings.size) return;
      this.loadingPlaces.set(true);
      this.places.prepare(placeStrings).finally(() => this.loadingPlaces.set(false));
    });

    // Load detailed maps for the countries the ancestors lived in.
    effect(() => {
      for (const code of this.neededCountries()) {
        if (this.countryTopos().has(code)) continue;
        loadTopology(`data/maps/${code.toLowerCase()}.json`).then(
          (topo) => this.countryTopos.update((m) => new Map(m).set(code, topo)),
          () => undefined,
        );
      }
    });

    // Re-fit when the projection changes (new root person).
    effect(() => {
      this.projection();
      this.resetZoom();
    });

    effect((onCleanup) => {
      const svg = this.svgRef().nativeElement;
      this.zoomBehavior = zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.5, 40])
        .on('zoom', (event: { transform: ZoomTransform }) => this.transform.set(event.transform));
      select(svg).call(this.zoomBehavior);
      onCleanup(() => select(svg).on('.zoom', null));
    });
  }

  protected setShowChildren(value: boolean): void {
    this.showChildren.set(value);
    try {
      localStorage.setItem(SHOW_CHILDREN_KEY, String(value));
    } catch {
      /* not persisted */
    }
  }

  /** Renders every generation (with the current zoom, theme and children setting) into an animated GIF. */
  async exportGif(): Promise<void> {
    const generations = this.store.generations();
    const root = this.store.root();
    if (!generations.length || !root) return;
    this.exportError.set(null);
    this.exporting.set('Preparing…');
    try {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const canvas = document.createElement('canvas');
      canvas.width = WIDTH;
      canvas.height = HEIGHT + GIF_HEADER;
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      const colors = readColors();
      const order = generations.map((g) => g.index);
      if (this.gifOrder() === 'oldest-first') order.reverse();
      const gif = GIFEncoder();
      for (let i = 0; i < order.length; i++) {
        this.exporting.set(`Rendering ${i + 1}/${order.length}…`);
        await new Promise((r) => setTimeout(r)); // let the progress label paint
        drawFrame(ctx, {
          base: this.base(),
          layers: this.layersFor(order[i], null),
          transform: this.transform(),
          showChildren: this.showChildren(),
          colors,
          index: order[i],
          generations: generations.map((g) => g.people.length),
          rootName: root.fullName,
        });
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const palette = quantize(data, 256);
        const last = i === order.length - 1;
        gif.writeFrame(applyPalette(data, palette), canvas.width, canvas.height, {
          palette,
          delay: last ? 3000 : 1300,
        });
      }
      gif.finish();
      const blob = new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ancestors-${slug(root.fullName)}.gif`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      this.exportError.set(`Could not create the GIF: ${err instanceof Error ? err.message : err}`);
    } finally {
      this.exporting.set(null);
    }
  }

  protected zoomBy(factor: number): void {
    if (this.zoomBehavior) select(this.svgRef().nativeElement).call(this.zoomBehavior.scaleBy, factor);
  }

  protected resetZoom(): void {
    if (this.zoomBehavior) select(this.svgRef().nativeElement).call(this.zoomBehavior.transform, zoomIdentity);
    else this.transform.set(zoomIdentity);
  }

  protected onDotEnter(event: MouseEvent, key: string): void {
    const rect = this.frameRef().nativeElement.getBoundingClientRect();
    this.hoverPos.set({ x: event.clientX - rect.left + 12, y: event.clientY - rect.top + 12 });
    this.hoverDot.set(key);
  }
}
