import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';
import { MessageKey } from '../core/messages';
import { ThemePreference, ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented" role="radiogroup" [attr.aria-label]="i18n.t('theme.aria')">
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="theme.preference() === option.value"
          [class.active]="theme.preference() === option.value"
          (click)="theme.preference.set(option.value)"
          [title]="i18n.t('theme.title', { label: i18n.t(option.label) })"
        >
          <span aria-hidden="true">{{ option.icon }}</span>
          <span class="segmented-label">{{ i18n.t(option.label) }}</span>
        </button>
      }
    </div>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeService);
  protected readonly i18n = inject(LanguageService);
  protected readonly options: { value: ThemePreference; label: MessageKey & `theme.${string}`; icon: string }[] = [
    { value: 'system', label: 'theme.system', icon: '◐' },
    { value: 'light', label: 'theme.light', icon: '☀' },
    { value: 'dark', label: 'theme.dark', icon: '☾' },
  ];
}
