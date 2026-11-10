import { describe, expect, it } from 'vitest';
import { decodeGedcom, extractYear, lifespan, locatingEvent, parseCoordinate, parseGedcom } from './gedcom-parser';

const SAMPLE = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jan /de Vries/
1 SEX M
1 BIRT
2 DATE 12 MAR 1801
2 PLAC Amsterdam, Noord-Holland, Nederland
3 MAP
4 LATI N52.3667
4 LONG E4.9
1 DEAT
2 DATE ABT 1872
1 FAMC @F1@
1 NOTE first line
2 CONC  continued
0 @I2@ INDI
1 NAME Pieter /de Vries/
1 SEX M
1 FAMS @F1@
0 @I3@ INDI
1 NAME Maria
2 GIVN Maria
2 SURN Jansen
1 SEX F
1 CHR
2 PLAC Leiden
0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I3@
1 CHIL @I1@
0 TRLR`;

describe('parseGedcom', () => {
  const tree = parseGedcom(SAMPLE);

  it('parses individuals and families', () => {
    expect(tree.people.size).toBe(3);
    expect(tree.families.get('@F1@')).toMatchObject({ husband: '@I2@', wife: '@I3@', children: ['@I1@'] });
  });

  it('parses names, sex and events', () => {
    const jan = tree.people.get('@I1@')!;
    expect(jan).toMatchObject({ givenName: 'Jan', surname: 'de Vries', sex: 'M', famc: ['@F1@'] });
    expect(jan.birth).toEqual({
      date: '12 MAR 1801', year: 1801, place: 'Amsterdam, Noord-Holland, Nederland', lat: 52.3667, lon: 4.9,
    });
    expect(lifespan(jan)).toBe('1801–1872');
  });

  it('falls back to GIVN/SURN and christening place', () => {
    const maria = tree.people.get('@I3@')!;
    expect(maria.fullName).toBe('Maria Jansen');
    expect(locatingEvent(maria)).toEqual({ kind: 'baptised', event: expect.objectContaining({ place: 'Leiden' }) });
  });

  it('fills famc from FAM CHIL when INDI lacks it', () => {
    const t = parseGedcom('0 @I1@ INDI\n1 NAME A /B/\n0 @F1@ FAM\n1 CHIL @I1@\n');
    expect(t.people.get('@I1@')!.famc).toEqual(['@F1@']);
  });
});

describe('helpers', () => {
  it('extracts years', () => {
    expect(extractYear('ABT 1750')).toBe(1750);
    expect(extractYear('BET 1700 AND 1710')).toBe(1700);
    expect(extractYear('12 FEB 1699/00')).toBe(1699);
    expect(extractYear('unknown')).toBeUndefined();
  });

  it('parses coordinates', () => {
    expect(parseCoordinate('N52.5')).toBe(52.5);
    expect(parseCoordinate('W4.25')).toBe(-4.25);
    expect(parseCoordinate('S1,5')).toBe(-1.5);
  });

  it('falls back to Windows-1252 for invalid UTF-8', () => {
    const bytes = new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]); // "Müller" in cp1252
    expect(decodeGedcom(bytes.buffer)).toEqual({ text: 'Müller', encoding: 'Windows-1252' });
  });
});
