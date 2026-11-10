/**
 * Builds per-country TopoJSON maps (provinces + municipalities/districts + outline + lakes)
 * into public/data/maps/.
 *
 * Sources (download into one directory, pass it as the first argument):
 *   geoBoundaries gbOpen simplified TopoJSON (https://www.geoboundaries.org):
 *     NLD-ADM1.topojson  NLD-ADM2.topojson   (provinces, gemeenten)      CC0
 *     BEL-ADM2.topojson  BEL-ADM4.topojson   (provinces, gemeenten)      ODbL 1.0
 *     DEU-ADM1.topojson  DEU-ADM3.topojson   (Länder, Kreise)            dl-de/by-2-0
 *   e.g. https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/gbOpen/NLD/ADM2/geoBoundaries-NLD-ADM2_simplified.topojson
 *   Optional lakes: a Natural Earth derived TopoJSON with a `<name>_lakes` object
 *   (netherlands-admin1.json from the league_game project) as NLD-lakes.json.
 *
 * Run: node scripts/build-maps.mjs /path/to/downloads
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { geoArea } from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify, quantile, filter, filterWeight } from 'topojson-simplify';
import { feature, merge, quantize } from 'topojson-client';

const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Usage: node scripts/build-maps.mjs <download-dir>');
  process.exit(1);
}

const COUNTRIES = [
  { code: 'NLD', provinces: 'NLD-ADM1', municipalities: 'NLD-ADM2', lakes: 'NLD-lakes.json' },
  { code: 'BEL', provinces: 'BEL-ADM2', municipalities: 'BEL-ADM4' },
  { code: 'DEU', provinces: 'DEU-ADM1', municipalities: 'DEU-ADM3' },
];

function load(name) {
  const topo = JSON.parse(readFileSync(join(srcDir, `${name}.topojson`), 'utf8'));
  const key = Object.keys(topo.objects)[0];
  return feature(topo, topo.objects[key]);
}

// geoBoundaries follows RFC 7946 (counter-clockwise exterior rings); d3-geo expects the
// opposite. A polygon covering more than half the sphere is wound the wrong way - reverse it.
function rewind(geometry) {
  const fixPolygon = (rings) => {
    const area = geoArea({ type: 'Polygon', coordinates: rings });
    return area > 2 * Math.PI ? rings.map((ring) => [...ring].reverse()) : rings;
  };
  if (geometry.type === 'Polygon') return { ...geometry, coordinates: fixPolygon(geometry.coordinates) };
  if (geometry.type === 'MultiPolygon')
    return { ...geometry, coordinates: geometry.coordinates.map(fixPolygon) };
  return geometry;
}

function clean(fc) {
  return {
    type: 'FeatureCollection',
    features: fc.features
      .filter((f) => f.geometry)
      .map((f, i) => ({
        type: 'Feature',
        id: i,
        properties: { name: f.properties.shapeName },
        geometry: rewind(f.geometry),
      })),
  };
}

/**
 * Simplifying tiny islands can collapse a ring so it comes out with the opposite winding;
 * d3 then treats it as "everything except this sliver" and fills the whole map. Drop those.
 */
function dropInvertedPolygons(topo) {
  const isInverted = (geometry) => geoArea(feature(topo, geometry)) > 2 * Math.PI;
  for (const object of Object.values(topo.objects)) {
    const geometries = object.type === 'GeometryCollection' ? object.geometries : [object];
    for (const g of geometries) {
      if (g.type === 'MultiPolygon') {
        g.arcs = g.arcs.filter((polygon) => !isInverted({ type: 'Polygon', arcs: polygon }));
      }
      if (g.type === 'Polygon' && isInverted(g)) g.arcs = [g.arcs[0]];
    }
  }
}

const outDir = 'public/data/maps';
mkdirSync(outDir, { recursive: true });

for (const c of COUNTRIES) {
  const provinces = clean(load(c.provinces));
  const municipalities = clean(load(c.municipalities));
  const tmp = topology({ provinces }, 1e5);
  const outline = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { code: c.code }, geometry: rewind(merge(tmp, tmp.objects.provinces.geometries)) }] };
  const objects = { provinces, municipalities, outline };
  if (c.lakes && existsSync(join(srcDir, c.lakes))) {
    const lt = JSON.parse(readFileSync(join(srcDir, c.lakes), 'utf8'));
    const key = Object.keys(lt.objects).find((k) => k.endsWith('_lakes'));
    objects.lakes = feature(lt, lt.objects[key]);
  }
  let topo = topology(objects, 2e4);
  topo = presimplify(topo);
  const minWeight = quantile(topo, 0.4);
  topo = simplify(topo, minWeight);
  topo = quantize(filter(topo, filterWeight(topo, minWeight / 100)), 1e4);
  dropInvertedPolygons(topo);
  const file = join(outDir, `${c.code.toLowerCase()}.json`);
  writeFileSync(file, JSON.stringify(topo));
  console.log(`${file}: ${provinces.features.length} provinces, ${municipalities.features.length} municipalities, ${(JSON.stringify(topo).length / 1024).toFixed(0)} KB`);
}
