import { GedcomTree, GedEvent, Person } from './gedcom.model';
import { Lang, translate } from './messages';

export interface Generation {
  kind: 'generation';
  /** 0 = the selected person, 1 = parents, 2 = grandparents, ... */
  index: number;
  /** Unique people in this generation. */
  people: Person[];
  /** Ancestor slots filled in this generation (> people.length when lines cross). */
  slots: number;
  /** Maximum possible ancestors at this depth (2^index). */
  possible: number;
}

const MAX_GENERATIONS = 200; // guards against cyclic (corrupt) parent links

export function parentsOf(tree: GedcomTree, person: Person): Person[] {
  const family = person.famc.map((id) => tree.families.get(id)).find(Boolean);
  if (!family) return [];
  return [family.husband, family.wife]
    .map((id) => (id ? tree.people.get(id) : undefined))
    .filter((p): p is Person => !!p);
}

/**
 * Walks up the tree one generation at a time. People reachable through multiple lines
 * (pedigree collapse) are counted once per generation; `slots` keeps the raw count.
 */
export function buildGenerations(tree: GedcomTree, rootId: string): Generation[] {
  const root = tree.people.get(rootId);
  if (!root) return [];
  const generations: Generation[] = [{ kind: 'generation', index: 0, people: [root], slots: 1, possible: 1 }];
  let current: { person: Person; multiplicity: number }[] = [{ person: root, multiplicity: 1 }];
  while (current.length && generations.length < MAX_GENERATIONS) {
    const next = new Map<string, { person: Person; multiplicity: number }>();
    for (const { person, multiplicity } of current) {
      for (const parent of parentsOf(tree, person)) {
        const entry = next.get(parent.id);
        if (entry) entry.multiplicity += multiplicity;
        else next.set(parent.id, { person: parent, multiplicity });
      }
    }
    if (!next.size) break;
    current = [...next.values()];
    const index = generations.length;
    generations.push({
      kind: 'generation',
      index,
      people: current.map((c) => c.person),
      slots: current.reduce((sum, c) => sum + c.multiplicity, 0),
      possible: 2 ** index,
    });
  }
  return generations;
}

/** Child within the previous generation for each person (for drawing lines on the map). */
export function childLinks(tree: GedcomTree, generations: Generation[], index: number) {
  if (index === 0) return [];
  const below = generations[index - 1]?.people ?? [];
  const links: { parent: Person; child: Person }[] = [];
  for (const childPerson of below) {
    for (const parent of parentsOf(tree, childPerson)) links.push({ parent, child: childPerson });
  }
  return links;
}

export function generationLabel(index: number, lang: Lang = 'en'): string {
  return translate(lang, 'generation.label', { index });
}

/** Length of a period in the "by period" view, in years. */
export const PERIOD_YEARS = 50;

/** Kinds of event shown in the period view, in display order. */
export const PERIOD_EVENT_KINDS = ['born', 'baptised', 'married', 'died', 'buried'] as const;
export type PeriodEventKind = (typeof PERIOD_EVENT_KINDS)[number];

/** A dated event in the life of the selected person or an ancestor. */
export interface PeriodEvent {
  /** Unique key, e.g. "@I1@:born" or "@F1@:married". */
  id: string;
  kind: PeriodEventKind;
  year: number;
  event: GedEvent;
  /** The person, or for a marriage the spouse(s) who are in the ancestry. */
  people: Person[];
}

export interface Period {
  kind: 'period';
  /** 0 = the most recent period, higher = earlier (same direction as generations). */
  index: number;
  /** Events in this period, chronological. */
  events: PeriodEvent[];
  /** Everyone involved in at least one of those events. */
  people: Person[];
  /** First and last year, inclusive (e.g. 1850 and 1899). */
  start: number;
  end: number;
}

/** One position on the timeline: a generation or a period, depending on the view. */
export type Step = Generation | Period;

/** What a step's column in the chart counts: people per generation, events per period. */
export function stepCount(step: Step): number {
  return step.kind === 'generation' ? step.people.length : step.events.length;
}

/** Every dated event of the given people: their own life events plus their marriages. */
export function datedEvents(tree: GedcomTree, people: Iterable<Person>): PeriodEvent[] {
  const included = new Map<string, Person>();
  for (const person of people) included.set(person.id, person);
  const events: PeriodEvent[] = [];
  const families = new Set<string>();
  for (const person of included.values()) {
    const own: [PeriodEventKind, GedEvent | undefined][] = [
      ['born', person.birth],
      ['baptised', person.christening],
      ['died', person.death],
      ['buried', person.burial],
    ];
    for (const [kind, event] of own) {
      if (event?.year !== undefined) {
        events.push({ id: `${person.id}:${kind}`, kind, year: event.year, event, people: [person] });
      }
    }
    for (const id of person.fams) families.add(id);
  }
  for (const id of families) {
    const family = tree.families.get(id);
    const event = family?.marriage;
    if (!family || event?.year === undefined) continue;
    const spouses = [family.husband, family.wife]
      .map((sid) => (sid ? included.get(sid) : undefined))
      .filter((p): p is Person => !!p);
    events.push({ id: `${family.id}:married`, kind: 'married', year: event.year, event, people: spouses });
  }
  const order = (k: PeriodEventKind) => PERIOD_EVENT_KINDS.indexOf(k);
  return events.sort(
    (a, b) =>
      a.year - b.year ||
      order(a.kind) - order(b.kind) ||
      a.people[0].fullName.localeCompare(b.people[0].fullName),
  );
}

/**
 * Groups every dated event of the selected person and their ancestors into `size`-year periods
 * aligned to multiples of `size`. Empty periods in between are kept so the timeline is
 * continuous. People without any dated event end up in `undated`.
 */
export function buildPeriods(
  tree: GedcomTree,
  generations: Generation[],
  size = PERIOD_YEARS,
): { periods: Period[]; undated: Person[] } {
  const people = new Map<string, Person>();
  for (const generation of generations) for (const p of generation.people) people.set(p.id, p);
  const events = datedEvents(tree, people.values());
  const dated = new Set(events.flatMap((e) => e.people.map((p) => p.id)));
  const undated = [...people.values()].filter((p) => !dated.has(p.id));
  if (!events.length) return { periods: [], undated };

  const byStart = new Map<number, PeriodEvent[]>();
  for (const event of events) {
    const start = Math.floor(event.year / size) * size;
    const bucket = byStart.get(start);
    if (bucket) bucket.push(event);
    else byStart.set(start, [event]);
  }
  const oldest = Math.floor(events[0].year / size) * size;
  const newest = Math.floor(events[events.length - 1].year / size) * size;
  const periods: Period[] = [];
  for (let start = newest; start >= oldest; start -= size) {
    const periodEvents = byStart.get(start) ?? [];
    const involved = new Map<string, Person>();
    for (const e of periodEvents) for (const p of e.people) involved.set(p.id, p);
    periods.push({
      kind: 'period',
      index: periods.length,
      events: periodEvents,
      people: [...involved.values()],
      start,
      end: start + size - 1,
    });
  }
  return { periods, undated };
}

/** Every distinct parent -> child pair along the ancestry in `generations`. */
export function lineageLinks(tree: GedcomTree, generations: Generation[]) {
  const links = new Map<string, { parent: Person; child: Person }>();
  for (let i = 1; i < generations.length; i++) {
    for (const link of childLinks(tree, generations, i)) {
      links.set(`${link.parent.id}>${link.child.id}`, link);
    }
  }
  return [...links.values()];
}

/** Display name of a step: "Grandparents", "1850–1899", ... */
export function stepLabel(step: Step, lang: Lang = 'en'): string {
  return step.kind === 'generation'
    ? generationLabel(step.index, lang)
    : translate(lang, 'period.label', { start: step.start, end: step.end });
}
