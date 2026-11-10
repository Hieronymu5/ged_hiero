import { Injectable, effect, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';
const STORAGE_KEY = 'ged-hiero-theme';

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ThemePreference>(readStored());

  constructor() {
    effect(() => {
      const theme = this.preference();
      const root = document.documentElement;
      if (theme === 'system') delete root.dataset['theme'];
      else root.dataset['theme'] = theme;
      try {
        if (theme === 'system') localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, theme);
      } catch {
        /* storage unavailable - preference just won't persist */
      }
    });
  }
}
