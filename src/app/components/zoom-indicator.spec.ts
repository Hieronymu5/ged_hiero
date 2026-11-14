import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZOOM_SHOWN_FOR, ZoomIndicator } from './zoom-indicator';

describe('ZoomIndicator', () => {
  const set = (key: string, value: unknown) =>
    Object.defineProperty(window, key, { configurable: true, value });
  const setNavigator = (key: string, value: string) =>
    Object.defineProperty(navigator, key, { configurable: true, value });

  beforeEach(() => {
    vi.useFakeTimers();
    set('devicePixelRatio', 2);
    set('outerWidth', 1440);
    set('innerWidth', 1440);
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of ['devicePixelRatio', 'outerWidth', 'innerWidth']) {
      delete (window as unknown as Record<string, unknown>)[key];
    }
    delete (navigator as unknown as Record<string, unknown>)['vendor'];
    delete (navigator as unknown as Record<string, unknown>)['userAgent'];
  });

  function render() {
    const fixture = TestBed.createComponent(ZoomIndicator);
    fixture.detectChanges();
    const shown = () =>
      (fixture.nativeElement as HTMLElement).querySelector('.zoom-indicator')?.textContent?.trim();
    const zoom = (ratio: number, inner: number) => {
      set('devicePixelRatio', ratio);
      set('innerWidth', inner);
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
    };
    return { fixture, shown, zoom };
  }

  it('shows Safari’s zoom for a moment after it changes', () => {
    setNavigator('vendor', 'Apple Computer, Inc.');
    setNavigator('userAgent', 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/26.0 Safari');
    const { fixture, shown, zoom } = render();
    // Nothing on load, or on a resize that doesn't zoom.
    expect(shown()).toBeUndefined();
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(shown()).toBeUndefined();

    zoom(2.5, 1152);
    expect(shown()).toBe('125%');
    vi.advanceTimersByTime(ZOOM_SHOWN_FOR - 100);
    zoom(3, 960);
    expect(shown()).toBe('150%');
    // From the last change.
    vi.advanceTimersByTime(ZOOM_SHOWN_FOR - 100);
    fixture.detectChanges();
    expect(shown()).toBe('150%');
    vi.advanceTimersByTime(100);
    fixture.detectChanges();
    expect(shown()).toBeUndefined();
  });

  it('leaves other browsers to show their own', () => {
    setNavigator('vendor', 'Google Inc.');
    const { shown, zoom } = render();
    zoom(2.5, 1152);
    expect(shown()).toBeUndefined();
  });
});
