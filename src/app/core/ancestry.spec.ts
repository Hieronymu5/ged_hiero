import { describe, expect, it } from 'vitest';
import { buildGenerations, buildPeriods, generationLabel, stepLabel } from './ancestry';
import { parseGedcom } from './gedcom-parser';

// Child I1; parents I2+I3; I2's parents I4+I5; I3's parents I4+I6 (I4 appears twice: pedigree collapse).
const GED = `
0 @I1@ INDI
1 FAMC @F1@
0 @I2@ INDI
1 FAMC @F2@
0 @I3@ INDI
1 FAMC @F3@
0 @I4@ INDI
0 @I5@ INDI
0 @I6@ INDI
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
0 @F2@ FAM
1 HUSB @I4@
1 WIFE @I5@
0 @F3@ FAM
1 HUSB @I4@
1 WIFE @I6@
`;

describe('buildGenerations', () => {
  it('counts unique people per generation and tracks pedigree collapse', () => {
    const gens = buildGenerations(parseGedcom(GED), '@I1@');
    expect(gens.map((g) => g.people.length)).toEqual([1, 2, 3]);
    expect(gens[2].slots).toBe(4);
    expect(gens[2].possible).toBe(4);
  });

  it('terminates on cyclic data', () => {
    const cyclic = parseGedcom('0 @I1@ INDI\n1 FAMC @F1@\n0 @F1@ FAM\n1 HUSB @I1@\n');
    expect(buildGenerations(cyclic, '@I1@').length).toBeLessThanOrEqual(200);
  });

  it('labels generations', () => {
    expect(generationLabel(1)).toBe('Parents');
    expect(generationLabel(3)).toBe('Great-grandparents');
    expect(generationLabel(5)).toBe('3× great-grandparents');
    expect(generationLabel(1, 'nl')).toBe('Ouders');
    expect(generationLabel(4, 'nl')).toBe('Betovergrootouders');
    expect(generationLabel(8, 'nl')).toBe('Oudbetovergrootouders');
    expect(generationLabel(12, 'nl')).toBe('Voorouders, 12e generatie');
  });
});

describe('buildPeriods', () => {
  // I1 b.1950; parents I2 b.1921 and I3 (christened 1899); grandparents I4 b.1780 (in both
  // lines) and I5 (no birth date, died 1840), married 1805; I6 has no dated events at all.
  const DATED = `
0 @I1@ INDI
1 BIRT
2 DATE 3 MAR 1950
1 FAMC @F1@
0 @I2@ INDI
1 BIRT
2 DATE 1921
1 FAMC @F2@
0 @I3@ INDI
1 CHR
2 DATE 1899
1 FAMC @F3@
0 @I4@ INDI
1 BIRT
2 DATE ABT 1780
1 FAMS @F2@
0 @I5@ INDI
1 DEAT
2 DATE 1840
1 FAMS @F2@
0 @I6@ INDI
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
0 @F2@ FAM
1 HUSB @I4@
1 WIFE @I5@
1 MARR
2 DATE 1805
0 @F3@ FAM
1 HUSB @I4@
1 WIFE @I6@
`;

  it('groups every dated event by 50-year period, newest first, keeping empty periods', () => {
    const tree = parseGedcom(DATED);
    const { periods, undated } = buildPeriods(tree, buildGenerations(tree, '@I1@'));
    expect(periods.map((p) => [p.start, p.end, p.events.map((e) => e.id)])).toEqual([
      [1950, 1999, ['@I1@:born']],
      [1900, 1949, ['@I2@:born']],
      [1850, 1899, ['@I3@:baptised']],
      [1800, 1849, ['@F2@:married', '@I5@:died']],
      [1750, 1799, ['@I4@:born']],
    ]);
    expect(periods.map((p) => p.index)).toEqual([0, 1, 2, 3, 4]);
    // The marriage involves both spouses; I5 is included through her death despite no birth date.
    expect(periods[3].events[0].people.map((p) => p.id)).toEqual(['@I4@', '@I5@']);
    expect(periods[3].people.map((p) => p.id)).toEqual(['@I4@', '@I5@']);
    expect(undated.map((p) => p.id)).toEqual(['@I6@']);
    expect(stepLabel(periods[2], 'nl')).toBe('1850–1899');
  });
});
