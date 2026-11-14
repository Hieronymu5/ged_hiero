/** Safari's page zoom levels, as percentages, which Cmd + and Cmd − step through. */
export const SAFARI_ZOOM_LEVELS = [50, 75, 85, 100, 115, 125, 150, 175, 200, 250, 300] as const;

/**
 * The browser's page zoom, as a percentage, estimated from the window: browsers don't tell a
 * page how far it's zoomed.
 *
 * The page's pixel ratio, `devicePixelRatio`, is the screen's own density times the zoom, so a
 * ratio of 2 can be a Retina screen at 100% or a plain one at 200%. The window's outer width, in
 * the screen's points, over its inner width, in the page's pixels, is about the zoom, near
 * enough to tell which: it's off by any sidebar. The screen's density is the whole number that
 * ratio leaves, and the zoom what's left, snapped to the nearest of Safari's levels.
 */
export function browserZoom(pixelRatio: number, outerWidth: number, innerWidth: number): number {
  const rough = outerWidth > 0 && innerWidth > 0 ? outerWidth / innerWidth : 1;
  const density = Math.max(1, Math.round(pixelRatio / rough));
  const percent = (pixelRatio / density) * 100;
  return SAFARI_ZOOM_LEVELS.reduce((best, level) =>
    Math.abs(level - percent) < Math.abs(best - percent) ? level : best,
  );
}

/** Whether the browser is Safari, which doesn't show its zoom; others built on WebKit say so. */
export function isSafari(navigator: Navigator): boolean {
  return (
    navigator.vendor === 'Apple Computer, Inc.' &&
    !/CriOS|FxiOS|EdgiOS|Chrome|Firefox/.test(navigator.userAgent)
  );
}
