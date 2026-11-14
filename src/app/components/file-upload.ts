import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LanguageService } from '../core/language.service';
import { TreeStore } from '../core/tree.store';

@Component({
  selector: 'app-file-upload',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label
      class="dropzone"
      [class.dragging]="dragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="dragging.set(false)"
      (drop)="onDrop($event)"
    >
      <input type="file" accept=".ged,.gedcom,text/plain" (change)="onPick($event)" />
      <span class="dropzone-icon" aria-hidden="true">⇪</span>
      <span class="dropzone-title">
        {{ store.loading() ? i18n.t('upload.reading') : i18n.t('upload.prompt') }}
      </span>
      <span class="muted">{{ i18n.t('upload.hint') }}</span>
    </label>
    <p class="small">
      {{ i18n.t('upload.noFile') }}
      <button type="button" class="link-button" (click)="store.loadSample()">{{ i18n.t('upload.sample') }}</button>
    </p>
    @if (store.error(); as error) {
      <p class="error" role="alert">{{ error(i18n.lang()) }}</p>
    }
  `,
})
export class FileUpload {
  protected readonly store = inject(TreeStore);
  protected readonly i18n = inject(LanguageService);
  protected readonly dragging = signal(false);

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) void this.store.load(file);
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void this.store.load(file);
    input.value = '';
  }
}
