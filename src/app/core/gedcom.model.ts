export interface GedEvent {
  /** Raw GEDCOM date value, e.g. "ABT 1750" or "12 MAR 1801". */
  date?: string;
  year?: number;
  place?: string;
  /** Coordinates given in the GEDCOM file itself (PLAC > MAP > LATI/LONG). */
  lat?: number;
  lon?: number;
}

export type Sex = 'M' | 'F' | 'U';

export interface Person {
  id: string;
  givenName: string;
  surname: string;
  fullName: string;
  sex: Sex;
  birth?: GedEvent;
  christening?: GedEvent;
  death?: GedEvent;
  burial?: GedEvent;
  /** Families this person is a child in, preferred (birth) family first. */
  famc: string[];
  /** Families this person is a spouse in. */
  fams: string[];
  /** Normalized name used for searching. */
  searchKey: string;
}

export interface Family {
  id: string;
  husband?: string;
  wife?: string;
  children: string[];
  marriage?: GedEvent;
}

export interface GedcomTree {
  people: Map<string, Person>;
  families: Map<string, Family>;
  encoding: string;
}
