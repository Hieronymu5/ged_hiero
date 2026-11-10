import { Family, GedcomTree, GedEvent, Person, Sex } from './gedcom.model';
import { normalizeText } from './text';

interface GedNode {
  tag: string;
  xref?: string;
  value: string;
  children: GedNode[];
}

const LINE = /^\s*(\d+)\s+(?:(@[^@]+@)\s+)?(\S+)(?:\s(.*))?$/;

/** Decodes raw file bytes: honours a BOM, then UTF-8, then falls back to Windows-1252. */
export function decodeGedcom(buffer: ArrayBuffer): { text: string; encoding: string } {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return { text: new TextDecoder('utf-16le').decode(bytes), encoding: 'UTF-16LE' };
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return { text: new TextDecoder('utf-16be').decode(bytes), encoding: 'UTF-16BE' };
  }
  try {
    return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), encoding: 'UTF-8' };
  } catch {
    return { text: new TextDecoder('windows-1252').decode(bytes), encoding: 'Windows-1252' };
  }
}

function buildNodes(text: string): GedNode[] {
  const roots: GedNode[] = [];
  const stack: GedNode[] = [];
  for (const rawLine of text.replace(/^﻿/, '').split(/\r\n|\r|\n/)) {
    if (!rawLine.trim()) continue;
    const match = LINE.exec(rawLine);
    if (!match) continue;
    const level = Number(match[1]);
    const tag = match[3].toUpperCase();
    const value = match[4] ?? '';
    const parent = level > 0 ? stack[level - 1] : undefined;
    if (tag === 'CONC' || tag === 'CONT') {
      if (parent) parent.value += (tag === 'CONT' ? '\n' : '') + value;
      continue;
    }
    const node: GedNode = { tag, xref: match[2], value, children: [] };
    if (level === 0) roots.push(node);
    else if (parent) parent.children.push(node);
    else continue; // orphaned line (level jump) - ignore
    stack[level] = node;
    stack.length = level + 1;
  }
  return roots;
}

const child = (node: GedNode, tag: string) => node.children.find((c) => c.tag === tag);
const children = (node: GedNode, tag: string) => node.children.filter((c) => c.tag === tag);

/** Extracts a representative year from GEDCOM dates like "ABT 1750", "BET 1700 AND 1710". */
export function extractYear(date: string | undefined): number | undefined {
  if (!date) return undefined;
  const match = /(?:^|\D)(\d{3,4})(?:\/\d{1,2})?(?!\d)/.exec(date);
  return match ? Number(match[1]) : undefined;
}

/** Parses "N52.3667" / "S12.5" / "-4.2" style coordinates. */
export function parseCoordinate(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^\s*([NSEW])?\s*(-?\d+(?:[.,]\d+)?)/i.exec(value);
  if (!match) return undefined;
  let num = Number(match[2].replace(',', '.'));
  if (match[1] && /[SW]/i.test(match[1])) num = -Math.abs(num);
  return Number.isFinite(num) ? num : undefined;
}

function parseEvent(node: GedNode | undefined): GedEvent | undefined {
  if (!node) return undefined;
  const date = child(node, 'DATE')?.value.trim() || undefined;
  const plac = child(node, 'PLAC');
  const place = plac?.value.trim() || undefined;
  const map = plac && child(plac, 'MAP');
  const lat = map && parseCoordinate(child(map, 'LATI')?.value);
  const lon = map && parseCoordinate(child(map, 'LONG')?.value);
  if (!date && !place) return undefined;
  const event: GedEvent = { date, year: extractYear(date), place };
  if (lat !== undefined && lon !== undefined) {
    event.lat = lat;
    event.lon = lon;
  }
  return event;
}

function parseName(node: GedNode): { given: string; surname: string } {
  const names = children(node, 'NAME');
  const primary = names[0];
  if (!primary) return { given: '', surname: '' };
  const raw = primary.value;
  const slash = /^(.*?)\/(.*?)\/(.*)$/.exec(raw);
  let given = slash ? `${slash[1]} ${slash[3]}`.trim() : raw.trim();
  let surname = slash ? slash[2].trim() : '';
  given = child(primary, 'GIVN')?.value.trim() || given;
  if (!surname) {
    const spfx = child(primary, 'SPFX')?.value.trim();
    const surn = child(primary, 'SURN')?.value.trim();
    if (surn) surname = spfx ? `${spfx} ${surn}` : surn;
  }
  return { given: given.replace(/\s+/g, ' '), surname: surname.replace(/\s+/g, ' ') };
}

function parsePerson(node: GedNode): Person {
  const { given, surname } = parseName(node);
  const sexValue = child(node, 'SEX')?.value.trim().toUpperCase();
  const sex: Sex = sexValue === 'M' || sexValue === 'F' ? sexValue : 'U';
  // Birth family first: FAMC without PEDI or with PEDI birth beats adopted/foster links.
  const famcNodes = children(node, 'FAMC').filter((c) => c.value.trim());
  const isBirth = (c: GedNode) => {
    const pedi = child(c, 'PEDI')?.value.trim().toLowerCase();
    return !pedi || pedi === 'birth';
  };
  famcNodes.sort((a, b) => Number(isBirth(b)) - Number(isBirth(a)));
  const fullName = [given, surname].filter(Boolean).join(' ') || '(unknown)';
  return {
    id: node.xref!,
    givenName: given,
    surname,
    fullName,
    sex,
    birth: parseEvent(child(node, 'BIRT')),
    christening: parseEvent(child(node, 'CHR') ?? child(node, 'BAPM')),
    death: parseEvent(child(node, 'DEAT')),
    burial: parseEvent(child(node, 'BURI') ?? child(node, 'CREM')),
    famc: famcNodes.map((c) => c.value.trim()),
    fams: children(node, 'FAMS').map((c) => c.value.trim()).filter(Boolean),
    searchKey: normalizeText(`${given} ${surname}`),
  };
}

function parseFamily(node: GedNode): Family {
  return {
    id: node.xref!,
    husband: child(node, 'HUSB')?.value.trim() || undefined,
    wife: child(node, 'WIFE')?.value.trim() || undefined,
    children: children(node, 'CHIL').map((c) => c.value.trim()).filter(Boolean),
    marriage: parseEvent(child(node, 'MARR')),
  };
}

export function parseGedcom(text: string, encoding = 'UTF-8'): GedcomTree {
  const people = new Map<string, Person>();
  const families = new Map<string, Family>();
  for (const node of buildNodes(text)) {
    if (!node.xref) continue;
    if (node.tag === 'INDI') people.set(node.xref, parsePerson(node));
    else if (node.tag === 'FAM') families.set(node.xref, parseFamily(node));
  }
  // Some exporters only record links on one side - fill in FAMC from FAM > CHIL.
  for (const family of families.values()) {
    for (const childId of family.children) {
      const person = people.get(childId);
      if (person && !person.famc.includes(family.id)) person.famc.push(family.id);
    }
  }
  return { people, families, encoding };
}

/** Year range label such as "1801–1872", "b. 1801" or "". */
export function lifespan(person: Person): string {
  const born = person.birth?.year ?? person.christening?.year;
  const died = person.death?.year ?? person.burial?.year;
  if (born && died) return `${born}–${died}`;
  if (born) return `b. ${born}`;
  if (died) return `d. ${died}`;
  return '';
}

/** The event used to place a person on the map: birth, then baptism, death, burial. */
export function locatingEvent(person: Person): { kind: string; event: GedEvent } | undefined {
  const candidates: [string, GedEvent | undefined][] = [
    ['born', person.birth],
    ['baptised', person.christening],
    ['died', person.death],
    ['buried', person.burial],
  ];
  for (const [kind, event] of candidates) {
    if (event && (event.place || event.lat !== undefined)) return { kind, event };
  }
  return undefined;
}
