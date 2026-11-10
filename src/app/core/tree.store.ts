import { Injectable, computed, signal } from '@angular/core';
import { buildGenerations } from './ancestry';
import { decodeGedcom, parseGedcom } from './gedcom-parser';
import { GedcomTree } from './gedcom.model';

@Injectable({ providedIn: 'root' })
export class TreeStore {
  readonly tree = signal<GedcomTree | null>(null);
  readonly fileName = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);
  readonly rootId = signal<string | null>(null);
  readonly generationIndex = signal(0);

  readonly root = computed(() => {
    const id = this.rootId();
    return id ? (this.tree()?.people.get(id) ?? null) : null;
  });

  readonly generations = computed(() => {
    const tree = this.tree();
    const id = this.rootId();
    return tree && id ? buildGenerations(tree, id) : [];
  });

  readonly currentGeneration = computed(() => this.generations()[this.generationIndex()] ?? null);

  async load(file: File): Promise<void> {
    return this.loadBuffer(file.name, () => file.arrayBuffer());
  }

  async loadSample(): Promise<void> {
    return this.loadBuffer('sample.ged', async () => {
      const res = await fetch('samples/sample.ged');
      if (!res.ok) throw new Error(`Could not load the sample (HTTP ${res.status}).`);
      return res.arrayBuffer();
    });
  }

  private async loadBuffer(name: string, read: () => Promise<ArrayBuffer>): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { text, encoding } = decodeGedcom(await read());
      const tree = parseGedcom(text, encoding);
      if (!tree.people.size) throw new Error('No individuals (INDI records) found in this file.');
      this.tree.set(tree);
      this.fileName.set(name);
      this.rootId.set(null);
      this.generationIndex.set(0);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : String(err));
    } finally {
      this.loading.set(false);
    }
  }

  selectRoot(id: string): void {
    this.rootId.set(id);
    this.generationIndex.set(0);
  }

  setGeneration(index: number): void {
    const max = this.generations().length - 1;
    this.generationIndex.set(Math.max(0, Math.min(max, index)));
  }

  reset(): void {
    this.tree.set(null);
    this.fileName.set(null);
    this.rootId.set(null);
    this.generationIndex.set(0);
  }
}
