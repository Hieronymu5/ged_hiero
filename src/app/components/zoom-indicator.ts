import { ChangeDetectionStrategy, Component, DestroyRef, DOCUMENT, inject, signal } from '@angular/core';
import { browserZoom, isSafari } from '../core/browser-zoom';

/** How long the zoom stays shown after the browser zooms, in milliseconds. */
export const ZOOM_SHOWN_FOR = 1500;

/**
 * The browser's page zoom, shown in the middle of the window for a moment after it changes, such
 * as with Cmd + or Cmd −. Only in Safari: Chrome, Edge, and Firefox show their own by the address
 * bar. The zoom is estimated (see `browserZoom`), as browsers don't tell a page. It's for sight
 * only, as the browser's own zoom isn't the page's to announce.
 */
@Component({
  selector: 'app-zoom-indicator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Drawn afresh on each change, so its fade starts again. -->
    @for (shown of shown(); track shown.id) {
      <div class="zoom-indicator" aria-hidden="true">{{ shown.percent }}%</div>
    }
  `,
})
export class ZoomIndicator {
  /** The zoom being shown, with a new id each change, or none while it isn't shown. */
  protected readonly shown = signal<readonly { id: number; percent: number }[]>([]);

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    if (!view || !isSafari(view.navigator)) {
      return;
    }
    // A zoom changes the page's pixel ratio and resizes it. Moving the window to a screen of
    // another density changes the ratio too; the zoom shown is still right, as it's estimated
    // afresh from the window.
    let ratio = view.devicePixelRatio;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const resized = () => {
      if (view.devicePixelRatio === ratio) {
        return;
      }
      ratio = view.devicePixelRatio;
      const percent = browserZoom(ratio, view.outerWidth, view.innerWidth);
      this.shown.update((shown) => [{ id: (shown[0]?.id ?? 0) + 1, percent }]);
      clearTimeout(timer);
      timer = setTimeout(() => this.shown.set([]), ZOOM_SHOWN_FOR);
    };
    view.addEventListener('resize', resized);
    inject(DestroyRef).onDestroy(() => {
      view.removeEventListener('resize', resized);
      clearTimeout(timer);
    });
  }
}
