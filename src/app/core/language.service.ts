import { Injectable, effect, signal } from '@angular/core';
import {
  detectLanguage,
  formatNumber,
  Lang,
  LANGUAGES,
  MessageArgs,
  MessageKey,
  translate,
} from './messages';

const STORAGE_KEY = 'ged-hiero-lang';

function initialLanguage(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (LANGUAGES.some((l) => l.code === stored)) return stored as Lang;
  } catch {
    /* storage unavailable */
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return detectLanguage(nav?.languages?.length ? nav.languages : [nav?.language ?? 'en']);
}

/**
 * Active UI language. Defaults to the browser/system language; an explicit choice is remembered.
 * `t()` and `number()` read the language signal, so templates and computeds update on a switch.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  readonly lang = signal<Lang>(initialLanguage());

  constructor() {
    effect(() => {
      const lang = this.lang();
      document.documentElement.lang = lang;
      document.title = translate(lang, 'app.title');
    });
  }

  /** Switches language and remembers the choice. */
  use(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* not persisted */
    }
  }

  t<K extends MessageKey>(key: K, ...args: MessageArgs<K>): string {
    return translate(this.lang(), key, ...args);
  }

  number(value: number, options?: Intl.NumberFormatOptions): string {
    return formatNumber(this.lang(), value, options);
  }
}
