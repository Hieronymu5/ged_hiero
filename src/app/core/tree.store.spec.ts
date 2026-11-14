import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseGedcom } from './gedcom-parser';
import { TreeStore } from './tree.store';

// I1 <- I2 <- I3 : three generations (0, 1, 2)
const GED = `0 @I1@ INDI\n1 FAMC @F1@\n0 @I2@ INDI\n1 FAMC @F2@\n0 @I3@ INDI
0 @F1@ FAM\n1 HUSB @I2@\n0 @F2@ FAM\n1 HUSB @I3@\n`;

describe('TreeStore playback', () => {
  let store: TreeStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = TestBed.inject(TreeStore);
    store.tree.set(parseGedcom(GED));
    store.selectRoot('@I1@');
  });
  afterEach(() => {
    store.pause();
    vi.useRealTimers();
  });

  it('plays from the oldest generation to the selected person, then stops', () => {
    store.play(1000);
    expect(store.stepIndex()).toBe(2);
    expect(store.playing()).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(store.stepIndex()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(store.stepIndex()).toBe(0);
    expect(store.playing()).toBe(false);
  });

  it('continues from the current generation and stops on manual navigation', () => {
    store.setStep(1);
    store.play(1000);
    expect(store.stepIndex()).toBe(1);
    store.setStep(2);
    expect(store.playing()).toBe(false);
    vi.advanceTimersByTime(3000);
    expect(store.stepIndex()).toBe(2);
  });

  it('switches to 50-year periods and plays through them', () => {
    // Undated test tree: no periods, so playback is a no-op.
    store.setStep(1);
    store.setMode('periods');
    expect(store.stepIndex()).toBe(0);
    expect(store.steps()).toEqual([]);
    store.play(1000);
    expect(store.playing()).toBe(false);
    store.setMode('generations');
    expect(store.steps().length).toBe(3);
  });
});
