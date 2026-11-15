import { describe, expect, it } from 'vitest';
import { versionLine } from './version-line';

describe('versionLine', () => {
  it('names the version and when it was built, in local time', () => {
    expect(versionLine('0.2.1', new Date(2026, 10, 4, 19, 7))).toBe(
      'Version 0.2.1 · Built 4 Nov 2026, 19:07',
    );
    expect(versionLine('1.0.0', new Date(2026, 0, 31, 0, 0))).toBe(
      'Version 1.0.0 · Built 31 Jan 2026, 00:00',
    );
  });

  it('is translated into Dutch', () => {
    expect(versionLine('0.2.1', new Date(2026, 2, 4, 9, 30), 'nl')).toBe(
      'Versie 0.2.1 · Gebouwd 4 mrt 2026, 09:30',
    );
    expect(versionLine('0.2.1', undefined, 'nl')).toBe('Versie 0.2.1');
  });

  it('names only the version when the build wasn’t stamped', () => {
    expect(versionLine('0.2.1')).toBe('Version 0.2.1');
    expect(versionLine('0.2.1', new Date('not a date'))).toBe('Version 0.2.1');
  });
});
