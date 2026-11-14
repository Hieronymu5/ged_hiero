import { describe, expect, it } from 'vitest';
import { detectLanguage, translate } from './messages';

describe('messages', () => {
  it('detects Dutch from the browser preferences, falling back to English', () => {
    expect(detectLanguage(['nl-NL', 'en-US'])).toBe('nl');
    expect(detectLanguage(['nl-BE'])).toBe('nl');
    expect(detectLanguage(['fr-FR', 'nl'])).toBe('nl');
    expect(detectLanguage(['en-GB', 'nl'])).toBe('en');
    expect(detectLanguage(['de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('translates with parameters, plurals and localized numbers', () => {
    expect(translate('en', 'topbar.people', { count: 1234 })).toBe('1,234 people');
    expect(translate('nl', 'topbar.people', { count: 1234 })).toBe('1.234 personen');
    expect(translate('nl', 'topbar.people', { count: 1 })).toBe('1 persoon');
    expect(translate('nl', 'lifespan.born', { year: 1801 })).toBe('geb. 1801');
  });
});
