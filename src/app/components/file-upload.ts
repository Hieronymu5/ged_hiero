import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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
        @if (store.loading()) { Reading file… } @else { Drop a GEDCOM file here, or click to choose one }
      </span>
      <span class="muted">.ged files from Gramps, MyHeritage, Ancestry, Aldfaer and others. The file stays in your browser.</span>
    </label>
    <p class="small">
      No file at hand?
      <button type="button" class="link-button" (click)="store.loadSample()">Try a fictional sample tree</button>
    </p>
    @if (store.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
  `,
})
export class FileUpload {
  protected readonly store = inject(TreeStore);
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
