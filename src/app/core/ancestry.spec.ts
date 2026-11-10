import { describe, expect, it } from 'vitest';
import { buildGenerations, generationLabel } from './ancestry';
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
  });
});
