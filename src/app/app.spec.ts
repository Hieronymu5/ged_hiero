import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { LanguageService } from './core/language.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  it('shows the upload screen before a file is loaded', async () => {
    TestBed.inject(LanguageService).lang.set('en');
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('ancestors');
    expect(el.querySelector('input[type=file]')).toBeTruthy();
    expect(el.querySelectorAll('app-theme-toggle .segmented button').length).toBe(3);
    expect(el.querySelectorAll('app-language-switcher .segmented button').length).toBe(2);
  });

  it('switches the interface to Dutch', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const nl = [...el.querySelectorAll<HTMLButtonElement>('app-language-switcher button')].find(
      (b) => b.textContent?.trim() === 'NL',
    )!;
    nl.click();
    await fixture.whenStable();
    expect(el.querySelector('h1')?.textContent).toContain('voorouders');
    expect(document.documentElement.lang).toBe('nl');
    expect(nl.getAttribute('aria-checked')).toBe('true');
    try {
      localStorage.removeItem('ged-hiero-lang');
    } catch {
      /* ignore */
    }
  });
});
