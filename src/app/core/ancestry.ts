import { GedcomTree, Person } from './gedcom.model';

export interface Generation {
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
  const generations: Generation[] = [{ index: 0, people: [root], slots: 1, possible: 1 }];
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

export function generationLabel(index: number): string {
  if (index === 0) return 'Selected person';
  if (index === 1) return 'Parents';
  if (index === 2) return 'Grandparents';
  if (index === 3) return 'Great-grandparents';
  return `${index - 2}× great-grandparents`;
}
