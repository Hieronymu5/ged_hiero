/** Lowercases, strips diacritics and punctuation so "'s-Gravenhage" ~ "s gravenhage". */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ĳ/g, 'ij')
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
