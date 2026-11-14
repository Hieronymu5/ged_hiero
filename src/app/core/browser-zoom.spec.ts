import { describe, expect, it } from 'vitest';
import { browserZoom } from './browser-zoom';

describe('browserZoom', () => {
  it('reads 100% on a Retina screen and on a plain one', () => {
    expect(browserZoom(2, 1440, 1440)).toBe(100);
    expect(browserZoom(1, 1920, 1920)).toBe(100);
  });

  it('tells a Retina screen at 100% from a plain one at 200%', () => {
    expect(browserZoom(2, 1440, 1440)).toBe(100);
    expect(browserZoom(2, 1920, 960)).toBe(200);
  });

  it('snaps to Safari’s levels', () => {
    // 115% on a Retina screen: the page is 1440 / 1.15 pixels wide.
    expect(browserZoom(2.3, 1440, 1252)).toBe(115);
    expect(browserZoom(1.7, 1440, 1694)).toBe(85);
    expect(browserZoom(1.5, 1440, 1440 / 0.75)).toBe(75);
    expect(browserZoom(2.5, 1440, 1152)).toBe(125);
  });

  it('isn’t thrown by a sidebar that widens the window', () => {
    // A 300 px sidebar beside a 1440 px page at 100% on a Retina screen.
    expect(browserZoom(2, 1740, 1440)).toBe(100);
  });
});
