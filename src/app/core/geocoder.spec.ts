import { describe, expect, it } from 'vitest';
import { COUNTRIES } from './countries';
import { Gazetteer, geocodePlace, parsePlace } from './geocoder';

const nld = new Gazetteer(COUNTRIES[0], {
  provinces: ['Noord-Holland', 'Fryslân', 'Zuid-Holland'],
  places: [
    ["Den Haag|'s-Gravenhage|The Hague", 52.08, 4.3, 2, 500000],
    ['Hoorn', 52.64, 5.06, 0, 70000],
    ['Hoorn', 53.39, 5.25, 1, 300],
  ],
});
const deu = new Gazetteer(COUNTRIES[2], {
  provinces: ['Nordrhein-Westfalen'],
  places: [['Köln|Cologne|Keulen', 50.94, 6.96, 0, 1000000], ['Hoorn', 51.0, 7.0, 0, 10]],
});
const gazetteers = new Map([['NLD', nld], ['DEU', deu]]);

describe('parsePlace', () => {
  it('strips country, qualifiers and parenthesised hints', () => {
    expect(parsePlace('Gemeente Hoorn (NH), Nederland')).toEqual({
      names: ['Hoorn'], country: COUNTRIES[0], provinceHints: ['NH'],
    });
    expect(parsePlace('Paris, France').country).toBe('other');
  });
});

describe('geocodePlace', () => {
  it('matches alternate spellings ignoring punctuation and accents', () => {
    expect(geocodePlace("'s-Gravenhage, Zuid-Holland", gazetteers)?.matched).toBe('Den Haag');
    expect(geocodePlace('Keulen, Duitsland', gazetteers)).toMatchObject({ country: 'DEU', lat: 50.94 });
    expect(geocodePlace('Koln', gazetteers)?.country).toBe('DEU');
  });

  it('uses the province to disambiguate', () => {
    expect(geocodePlace('Hoorn, Friesland', gazetteers)?.lat).toBe(53.39);
    expect(geocodePlace('Hoorn (NH)', gazetteers)?.lat).toBe(52.64);
    expect(geocodePlace('Hoorn', gazetteers)?.lat).toBe(52.64); // most populous
    expect(geocodePlace('Hoorn, Deutschland', gazetteers)?.country).toBe('DEU');
  });

  it('does not guess places in unsupported countries', () => {
    expect(geocodePlace('Hoorn, France', gazetteers)).toBeUndefined();
  });
});
