import { COUNTRIES, CountryConfig, findCountry } from './countries';
import { normalizeText } from './text';

export interface GeoPoint {
  lat: number;
  lon: number;
  /** ISO alpha-3 of the matched gazetteer, if any. */
  country?: string;
  /** Name of the matched gazetteer entry. */
  matched?: string;
  population?: number;
}

/** Raw gazetteer file: places are [names("a|b"), lat, lon, provinceIndex, population]. */
export interface GazetteerFile {
  provinces: string[];
  places: [string, number, number, number, number][];
}

export class Gazetteer {
  private readonly byName = new Map<string, number[]>();
  private readonly provinceIndex = new Map<string, number>();

  constructor(
    readonly country: CountryConfig,
    private readonly data: GazetteerFile,
  ) {
    data.places.forEach(([names], i) => {
      for (const name of new Set(names.split('|').map(normalizeText))) {
        const list = this.byName.get(name);
        if (list) list.push(i);
        else this.byName.set(name, [i]);
      }
    });
    data.provinces.forEach((name, i) => this.provinceIndex.set(normalizeText(name), i));
    for (const [alias, name] of Object.entries(country.provinceAliases)) {
      const i = data.provinces.indexOf(name);
      if (i >= 0) this.provinceIndex.set(normalizeText(alias), i);
    }
  }

  province(part: string): number | undefined {
    return this.provinceIndex.get(normalizeText(part));
  }

  /** Best (most populous, already sorted) match for a name, optionally within a province. */
  lookup(name: string, province?: number): GeoPoint | undefined {
    const hits = this.byName.get(normalizeText(name));
    if (!hits?.length) return undefined;
    const index = province === undefined ? hits[0] : hits.find((i) => this.data.places[i][3] === province);
    if (index === undefined) return undefined;
    const [names, lat, lon, , population] = this.data.places[index];
    return { lat, lon, country: this.country.code, matched: names.split('|')[0], population };
  }
}

/** Prefixes that wrap the real place name, e.g. "Gemeente Ede", "Kirchspiel Lingen". */
const QUALIFIER = /^(gemeente|gem\.?|parochie|kerspel|kirchspiel|ksp\.?|pfarrei|stadt|dorf|amt|kreis|landkreis|commune|ville de|stad)\s+/i;

export interface ParsedPlace {
  /** Place parts, most specific first, with country/province parts removed. */
  names: string[];
  country?: CountryConfig | 'other';
  provinceHints: string[];
}

export function parsePlace(place: string): ParsedPlace {
  const parts: string[] = [];
  const provinceHints: string[] = [];
  for (let raw of place.split(/[,;]/)) {
    raw = raw.trim();
    // "Hoorn (NH)" -> name "Hoorn", hint "NH"
    const paren = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(raw);
    if (paren) {
      raw = paren[1].trim();
      if (paren[2].trim()) provinceHints.push(paren[2].trim());
    }
    raw = raw.replace(QUALIFIER, '').trim();
    if (raw) parts.push(raw);
  }
  let country: CountryConfig | 'other' | undefined;
  // Country is normally last; scan from the end and drop it.
  for (let i = parts.length - 1; i >= 0 && i >= parts.length - 2; i--) {
    const found = findCountry(parts[i]);
    if (found) {
      country = found;
      parts.splice(i, 1);
      break;
    }
  }
  return { names: parts, country, provinceHints };
}

/** Which countries' gazetteers are needed to geocode this place. */
export function countriesForPlace(place: string): string[] {
  const { country } = parsePlace(place);
  if (country === 'other') return [];
  return country ? [country.code] : COUNTRIES.map((c) => c.code);
}

export function geocodePlace(place: string, gazetteers: Map<string, Gazetteer>): GeoPoint | undefined {
  const { names, country, provinceHints } = parsePlace(place);
  if (country === 'other' || !names.length) return undefined;
  const candidates = country
    ? [gazetteers.get(country.code)].filter((g): g is Gazetteer => !!g)
    : [...gazetteers.values()];

  // Without an explicit country, a province part ("..., Gelderland") picks the gazetteer.
  const scored = candidates.map((gazetteer) => {
    const hints = [...provinceHints, ...names.slice(1)];
    const province = hints.map((h) => gazetteer.province(h)).find((p) => p !== undefined);
    return { gazetteer, province };
  });
  const withProvince = scored.filter((s) => s.province !== undefined);
  const ordered = withProvince.length ? withProvince : scored;

  // Most specific part first; across countries the most populous match wins, but a match
  // inside the hinted province beats any match outside it.
  for (const name of names) {
    let best: GeoPoint | undefined;
    let bestInProvince = false;
    for (const { gazetteer, province } of ordered) {
      const inProvince = province !== undefined ? gazetteer.lookup(name, province) : undefined;
      const hit = inProvince ?? gazetteer.lookup(name);
      if (!hit) continue;
      const better =
        !best ||
        (!!inProvince && !bestInProvince) ||
        (!!inProvince === bestInProvince && (hit.population ?? 0) > (best.population ?? 0));
      if (better) {
        best = hit;
        bestInProvince = !!inProvince;
      }
    }
    if (best) return best;
  }
  return undefined;
}
