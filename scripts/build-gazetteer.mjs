/**
 * Builds compact offline gazetteers (populated places) for geocoding GEDCOM place names
 * into public/data/places/<code>.json.
 *
 * Source: GeoNames country dumps (CC BY 4.0, https://www.geonames.org)
 *   https://download.geonames.org/export/dump/NL.zip, BE.zip, DE.zip
 * Unzip NL.txt, BE.txt and DE.txt into one directory and pass it as the first argument.
 * Run scripts/build-maps.mjs first: each place is tagged with the province polygon it
 * falls in, so "Hoorn, Noord-Holland" can be told apart from Hoorn on Terschelling.
 *
 * Run: node scripts/build-gazetteer.mjs /path/to/downloads
 *
 * Output: { provinces: string[], places: [names("a|b|c"), lat, lon, provinceIndex, population][] }
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { geoContains, geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Usage: node scripts/build-gazetteer.mjs <download-dir>');
  process.exit(1);
}

const COUNTRIES = { NL: 'nld', BE: 'bel', DE: 'deu' };
const LATIN = /^[\p{Script=Latin}\s'’.\-()]+$/u;

function namesFor(cols) {
  const names = new Set([cols[1], cols[2]]);
  for (const alt of (cols[3] || '').split(',')) {
    const a = alt.trim();
    if (a.length < 2 || a.length > 40 || !LATIN.test(a)) continue;
    if (/^[A-Z]{2,4}$/.test(a)) continue; // abbreviations / codes
    names.add(a);
  }
  return [...names].filter(Boolean);
}

mkdirSync('public/data/places', { recursive: true });

for (const [iso, code] of Object.entries(COUNTRIES)) {
  const topo = JSON.parse(readFileSync(`public/data/maps/${code}.json`, 'utf8'));
  const provinces = feature(topo, topo.objects.provinces).features.map((f) => ({
    name: f.properties.name,
    feature: f,
    bounds: geoBounds(f),
  }));
  const findProvince = (lon, lat) =>
    provinces.findIndex(
      (p) =>
        lon >= p.bounds[0][0] &&
        lon <= p.bounds[1][0] &&
        lat >= p.bounds[0][1] &&
        lat <= p.bounds[1][1] &&
        geoContains(p.feature, [lon, lat]),
    );

  const places = [];
  const lines = readFileSync(join(srcDir, `${iso}.txt`), 'utf8').split('\n');
  for (const line of lines) {
    const cols = line.split('\t');
    if (cols[6] !== 'P' || cols[7] === 'PPLX' || cols[7] === 'PPLH') continue; // skip city sections & historical dupes
    const lat = Number(cols[4]);
    const lon = Number(cols[5]);
    places.push([
      namesFor(cols).join('|'),
      Math.round(lat * 1000) / 1000,
      Math.round(lon * 1000) / 1000,
      findProvince(lon, lat),
      Number(cols[14]) || 0,
    ]);
  }
  places.sort((a, b) => b[4] - a[4]);
  const out = { provinces: provinces.map((p) => p.name), places };
  const file = `public/data/places/${code}.json`;
  writeFileSync(file, JSON.stringify(out));
  console.log(`${file}: ${places.length} places, ${(JSON.stringify(out).length / 1024).toFixed(0)} KB`);
}
