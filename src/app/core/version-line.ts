import { Lang, translate } from './messages';

const MONTHS: Record<Lang, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  nl: ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
};

/**
 * The app's version and, when it's known, when it was built, in local time, such as
 * "Version 0.2.1 · Built 4 Nov 2026, 19:17". A build that wasn't stamped, such as one being
 * served while it's worked on, shows only its version.
 */
export function versionLine(version: string, built?: Date, lang: Lang = 'en'): string {
  if (!built || Number.isNaN(built.getTime())) {
    return translate(lang, 'version.line', { version });
  }
  const time = [built.getHours(), built.getMinutes()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  const date = `${built.getDate()} ${MONTHS[lang][built.getMonth()]} ${built.getFullYear()}`;
  return translate(lang, 'version.built', { version, date: `${date}, ${time}` });
}
