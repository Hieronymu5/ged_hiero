import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LanguageService } from '../core/language.service';
import { LANGUAGES } from '../core/messages';

@Component({
  selector: 'app-language-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="segmented" role="radiogroup" [attr.aria-label]="i18n.t('lang.aria')">
      @for (option of languages; track option.code) {
        <button
          type="button"
          role="radio"
          [attr.lang]="option.code"
          [attr.aria-checked]="i18n.lang() === option.code"
          [attr.aria-label]="option.name"
          [class.active]="i18n.lang() === option.code"
          (click)="i18n.use(option.code)"
          [title]="option.name"
        >
          {{ option.short }}
        </button>
      }
    </div>
  `,
})
export class LanguageSwitcher {
  protected readonly i18n = inject(LanguageService);
  protected readonly languages = LANGUAGES;
}
