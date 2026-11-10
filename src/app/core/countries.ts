import { normalizeText } from './text';

export interface CountryConfig {
  /** ISO 3166-1 alpha-3, also the data file name (lowercase). */
  code: string;
  name: string;
  /** Names used in GEDCOM place strings (any language, historical). */
  aliases: string[];
  /** Extra province names mapped to the province names in the map data. */
  provinceAliases: Record<string, string>;
}

/**
 * Countries with detailed maps and gazetteers in public/data. To add one, run the build
 * scripts for it (scripts/build-maps.mjs, scripts/build-gazetteer.mjs) and add it here.
 */
export const COUNTRIES: CountryConfig[] = [
  {
    code: 'NLD',
    name: 'Netherlands',
    aliases: ['Nederland', 'Netherlands', 'The Netherlands', 'Holland', 'Niederlande', 'Pays-Bas', 'Pays Bas', 'NL', 'NLD', 'Koninkrijk der Nederlanden', 'Bataafse Republiek', 'Republiek der Zeven Verenigde Nederlanden'],
    provinceAliases: {
      'NH': 'Noord-Holland', 'North Holland': 'Noord-Holland', 'Nordholland': 'Noord-Holland',
      'ZH': 'Zuid-Holland', 'South Holland': 'Zuid-Holland', 'Südholland': 'Zuid-Holland',
      'NB': 'Noord-Brabant', 'North Brabant': 'Noord-Brabant', 'Nordbrabant': 'Noord-Brabant', 'Staats-Brabant': 'Noord-Brabant',
      'GLD': 'Gelderland', 'Gelre': 'Gelderland', 'Guelders': 'Gelderland',
      'Friesland': 'Fryslân', 'Frisia': 'Fryslân', 'FR': 'Fryslân',
      'GR': 'Groningen', 'DR': 'Drenthe', 'OV': 'Overijssel', 'UT': 'Utrecht', 'FL': 'Flevoland',
      'ZL': 'Zeeland', 'Zealand': 'Zeeland', 'LB': 'Limburg', 'LI': 'Limburg',
    },
  },
  {
    code: 'BEL',
    name: 'Belgium',
    aliases: ['België', 'Belgie', 'Belgium', 'Belgique', 'Belgien', 'BE', 'BEL', 'Oostenrijkse Nederlanden', 'Zuidelijke Nederlanden', 'Spaanse Nederlanden'],
    provinceAliases: {
      'Antwerp': 'Antwerpen', 'Anvers': 'Antwerpen',
      'Hainaut': 'Henegouwen', 'Hennegau': 'Henegouwen',
      'Liège': 'Luik', 'Liege': 'Luik', 'Lüttich': 'Luik',
      'Luxembourg': 'Luxemburg',
      'Namur': 'Namen',
      'East Flanders': 'Oost-Vlaanderen', 'Flandre-Orientale': 'Oost-Vlaanderen', 'Ostflandern': 'Oost-Vlaanderen',
      'West Flanders': 'West-Vlaanderen', 'Flandre-Occidentale': 'West-Vlaanderen', 'Westflandern': 'West-Vlaanderen',
      'Flemish Brabant': 'Vlaams-Brabant', 'Brabant flamand': 'Vlaams-Brabant', 'Flämisch-Brabant': 'Vlaams-Brabant',
      'Walloon Brabant': 'Waals-Brabant', 'Brabant wallon': 'Waals-Brabant', 'Wallonisch-Brabant': 'Waals-Brabant',
      'Bruxelles': 'Brussels', 'Brussel': 'Brussels',
    },
  },
  {
    code: 'DEU',
    name: 'Germany',
    aliases: ['Deutschland', 'Germany', 'Duitsland', 'Allemagne', 'DE', 'DEU', 'BRD', 'Deutsches Reich', 'Preußen', 'Preussen', 'Pruisen', 'Prussia', 'Heiliges Römisches Reich'],
    provinceAliases: {
      'Bavaria': 'Bayern', 'Beieren': 'Bayern', 'Bavière': 'Bayern',
      'Hesse': 'Hessen', 'Lower Saxony': 'Niedersachsen', 'Nedersaksen': 'Niedersachsen', 'Hannover': 'Niedersachsen', 'Ostfriesland': 'Niedersachsen', 'Oost-Friesland': 'Niedersachsen',
      'North Rhine-Westphalia': 'Nordrhein-Westfalen', 'Noordrijn-Westfalen': 'Nordrhein-Westfalen', 'NRW': 'Nordrhein-Westfalen', 'Westfalen': 'Nordrhein-Westfalen', 'Westphalia': 'Nordrhein-Westfalen', 'Rheinprovinz': 'Nordrhein-Westfalen',
      'Rhineland-Palatinate': 'Rheinland-Pfalz', 'Rijnland-Palts': 'Rheinland-Pfalz', 'Pfalz': 'Rheinland-Pfalz',
      'Saxony': 'Sachsen', 'Saksen': 'Sachsen', 'Saxony-Anhalt': 'Sachsen-Anhalt',
      'Thuringia': 'Thüringen', 'Thüringen': 'Thüringen',
      'Württemberg': 'Baden-Württemberg', 'Baden': 'Baden-Württemberg',
      'Mecklenburg': 'Mecklenburg-Vorpommern', 'Pommern': 'Mecklenburg-Vorpommern',
      'Holstein': 'Schleswig-Holstein', 'Schleswig': 'Schleswig-Holstein',
    },
  },
];

const countryByAlias = new Map<string, CountryConfig>();
for (const country of COUNTRIES) {
  for (const alias of [country.name, ...country.aliases]) countryByAlias.set(normalizeText(alias), country);
}

/** Country names we recognise but have no detailed data for (so we don't guess a NL/BE/DE town). */
const OTHER_COUNTRIES = new Set(
  [
    'France', 'Frankrijk', 'Frankreich', 'Luxemburg', 'Luxembourg', 'Luxemburg (Groothertogdom)', 'Österreich', 'Oostenrijk', 'Austria',
    'Schweiz', 'Zwitserland', 'Switzerland', 'Suisse', 'Polen', 'Poland', 'Polska', 'Danmark', 'Denemarken', 'Denmark',
    'England', 'Engeland', 'United Kingdom', 'UK', 'Scotland', 'Schotland', 'Ireland', 'Ierland',
    'USA', 'United States', 'Verenigde Staten', 'Canada', 'Australia', 'Australië', 'South Africa', 'Zuid-Afrika',
    'Indonesia', 'Indonesië', 'Nederlands-Indië', 'Nederlands Indië', 'Suriname', 'Curaçao', 'Italia', 'Italy', 'Italië',
    'España', 'Spain', 'Spanje', 'Sweden', 'Zweden', 'Norway', 'Noorwegen', 'Czech Republic', 'Tsjechië', 'Hungary',
  ].map(normalizeText),
);

export function findCountry(part: string): CountryConfig | 'other' | undefined {
  const key = normalizeText(part);
  const country = countryByAlias.get(key);
  if (country) return country;
  return OTHER_COUNTRIES.has(key) ? 'other' : undefined;
}

/** Rough [west, south, east, north] boxes, used to pick maps for points with raw coordinates. */
export const COUNTRY_BBOX: Record<string, [number, number, number, number]> = {
  NLD: [3.3, 50.7, 7.3, 53.6],
  BEL: [2.5, 49.5, 6.4, 51.5],
  DEU: [5.8, 47.2, 15.1, 55.1],
};
