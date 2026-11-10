import { Injectable, signal } from '@angular/core';
import { COUNTRIES } from './countries';
import { countriesForPlace, Gazetteer, GazetteerFile, geocodePlace, GeoPoint } from './geocoder';
import { GedEvent } from './gedcom.model';

/** Loads gazetteers on demand and geocodes GEDCOM place strings (cached). */
@Injectable({ providedIn: 'root' })
export class PlacesService {
  private readonly gazetteers = new Map<string, Gazetteer>();
  private readonly loading = new Map<string, Promise<void>>();
  private readonly cache = new Map<string, GeoPoint | null>();
  /** Bumped whenever a gazetteer finishes loading so computed geocodes re-run. */
  readonly version = signal(0);

  /** Ensures the gazetteers needed for these place strings are loaded. */
  async prepare(places: Iterable<string>): Promise<void> {
    const needed = new Set<string>();
    for (const place of places) for (const code of countriesForPlace(place)) needed.add(code);
    await Promise.all([...needed].map((code) => this.load(code)));
  }

  private load(code: string): Promise<void> {
    if (this.gazetteers.has(code)) return Promise.resolve();
    let pending = this.loading.get(code);
    if (!pending) {
      const country = COUNTRIES.find((c) => c.code === code)!;
      pending = fetch(`data/places/${code.toLowerCase()}.json`)
        .then((res) => {
          if (!res.ok) throw new Error(`Gazetteer ${code}: HTTP ${res.status}`);
          return res.json() as Promise<GazetteerFile>;
        })
        .then((data) => {
          this.gazetteers.set(code, new Gazetteer(country, data));
          this.cache.clear();
          this.version.update((v) => v + 1);
        })
        .finally(() => this.loading.delete(code));
      this.loading.set(code, pending);
    }
    return pending;
  }

  locate(event: GedEvent): GeoPoint | undefined {
    if (event.lat !== undefined && event.lon !== undefined) return { lat: event.lat, lon: event.lon };
    if (!event.place) return undefined;
    let hit = this.cache.get(event.place);
    if (hit === undefined) {
      hit = geocodePlace(event.place, this.gazetteers) ?? null;
      this.cache.set(event.place, hit);
    }
    return hit ?? undefined;
  }
}
