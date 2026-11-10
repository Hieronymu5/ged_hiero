# Hiero – GEDCOM ancestry explorer

Angular app for exploring GEDCOM (`.ged`) files entirely in the browser:

- **Upload** a GEDCOM file (drag & drop or file picker; UTF-8, UTF-16 and Windows-1252 are detected), or try the fictional sample at `public/samples/sample.ged`.
- **Search** for a person by name (add a birth/death year to narrow it down, e.g. `Jansen 1850`).
- See **how many generations** of ancestors are recorded, and **step through each generation** (buttons, slider, ←/→ keys, or click a column in the chart).
- **Chart** of people per generation, oldest on the left leading up to the selected person, with a table view. Pedigree collapse (the same ancestor reached through several lines) is counted once.
- **Map** of the selected generation, with lines to where their children were born. Detailed municipality/district maps of the **Netherlands, Belgium and Germany** are loaded only for the countries the ancestors actually lived in. Zoom with the scroll wheel or the +/− buttons, and drag to pan.
- **Show children** toggle: show or hide where each ancestor's children were born, and the lines to them.
- **Save as GIF**: an animated GIF that steps through every generation, oldest first or the selected person first. It uses the map's current zoom, theme and children setting.
- **System / light / dark** theme, remembered per browser.

## Development

```bash
npm start          # http://localhost:4200
npm test           # vitest unit tests
npm run build
```

## How places are located

1. Coordinates in the file itself (`PLAC > MAP > LATI/LONG`) are used as-is.
2. Otherwise the place string is matched against offline GeoNames gazetteers (`public/data/places/*.json`).
   The country part (`Nederland`, `Belgique`, `Duitsland`, `Preußen`, …) picks the gazetteer. Province parts or
   hints (`Hoorn (NH)`, `…, Friesland`) separate places that share a name. Spelling variants and accents are
   ignored (`'s-Gravenhage` = `Den Haag`, `Keulen` = `Köln`). Places in other countries are not guessed.

Country names and aliases live in `src/app/core/countries.ts`.

## Map & place data

| File | Source | Licence |
|---|---|---|
| `public/data/maps/nld.json` | geoBoundaries NLD ADM1/ADM2 (PDOK) + Natural Earth lakes | CC0 / public domain |
| `public/data/maps/bel.json` | geoBoundaries BEL ADM2/ADM4 (Statbel) | ODbL 1.0 |
| `public/data/maps/deu.json` | geoBoundaries DEU ADM1/ADM3 (BKG) | dl-de/by-2-0 |
| `public/data/maps/world-50m.json` | Natural Earth via world-atlas | public domain |
| `public/data/places/*.json` | GeoNames country dumps | CC BY 4.0 |

To rebuild the data or add a country, download the sources described at the top of each script, then run:

```bash
node scripts/build-maps.mjs <download-dir>
node scripts/build-gazetteer.mjs <download-dir>
```

and add the country to `COUNTRIES` / `COUNTRY_BBOX` in `src/app/core/countries.ts`.
