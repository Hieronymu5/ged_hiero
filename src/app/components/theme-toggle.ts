import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented" role="radiogroup" aria-label="Color theme">
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="theme.preference() === option.value"
          [class.active]="theme.preference() === option.value"
          (click)="theme.preference.set(option.value)"
          [title]="option.label + ' theme'"
        >
          <span aria-hidden="true">{{ option.icon }}</span>
          <span class="segmented-label">{{ option.label }}</span>
        </button>
      }
    </div>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly options: { value: ThemePreference; label: string; icon: string }[] = [
    { value: 'system', label: 'System', icon: '◐' },
    { value: 'light', label: 'Light', icon: '☀' },
    { value: 'dark', label: 'Dark', icon: '☾' },
  ];
}
