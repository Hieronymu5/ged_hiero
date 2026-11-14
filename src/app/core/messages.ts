/**
 * UI strings for every supported language. English is the source; the Dutch table must have the
 * same keys and parameter shapes (enforced by the `Messages` type).
 */
export type Lang = 'en' | 'nl';

export const LANGUAGES: { code: Lang; short: string; name: string }[] = [
  { code: 'en', short: 'EN', name: 'English' },
  { code: 'nl', short: 'NL', name: 'Nederlands' },
];

/** Formats a number for the active language. */
export type NumberFormat = (value: number, options?: Intl.NumberFormatOptions) => string;

type Message = string | ((params: any, num: NumberFormat) => string);

const en = {
  'app.title': 'Hiero · GEDCOM explorer',
  'lang.aria': 'Language',

  'theme.aria': 'Color theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.title': (p: { label: string }) => `${p.label} theme`,

  'topbar.people': (p: { count: number }, n: NumberFormat) =>
    `${n(p.count)} ${p.count === 1 ? 'person' : 'people'}`,
  'topbar.openAnother': 'Open another file',

  'welcome.title': 'Explore where your ancestors came from',
  'welcome.lede':
    'Load a GEDCOM file, pick a person, and step back through every generation of their ancestors on detailed maps of the Netherlands, Belgium and Germany.',
  'upload.reading': 'Reading file…',
  'upload.prompt': 'Drop a GEDCOM file here, or click to choose one',
  'upload.hint':
    '.ged files from Gramps, MyHeritage, Ancestry, Aldfaer and others. The file stays in your browser.',
  'upload.noFile': 'No file at hand?',
  'upload.sample': 'Try a fictional sample tree',
  'error.sampleHttp': (p: { status: number }) => `Could not load the sample (HTTP ${p.status}).`,
  'error.noPeople': 'No individuals (INDI records) found in this file.',

  'root.eyebrow': 'Selected person',
  'root.depth': (p: { depth: number; total: number }, n: NumberFormat) =>
    `${p.depth === 1 ? 'generation' : 'generations'} of ancestors recorded · ${n(p.total)} ancestors in total`,
  'empty.hint':
    'Search for a person on the left to see their ancestors by generation and on the map.',

  'search.label': 'Find a person',
  'search.placeholder': 'e.g. Jan Jansen, or Jansen 1850',
  'search.matches': (p: { total: number }, n: NumberFormat) =>
    `${n(p.total)} ${p.total === 1 ? 'match' : 'matches'}`,
  'search.showingFirst': (p: { count: number }) => `showing first ${p.count}`,
  'search.depthTitle': (p: { depth: number }) => `${p.depth} generations of ancestors recorded`,
  'search.depthBadge': (p: { depth: number }) => `${p.depth} gen`,

  'generation.label': (p: { index: number }) => {
    const { index } = p;
    if (index === 0) return 'Selected person';
    if (index === 1) return 'Parents';
    if (index === 2) return 'Grandparents';
    if (index === 3) return 'Great-grandparents';
    return `${index - 2}× great-grandparents`;
  },
  'generation.number': (p: { index: number }) => `Generation ${p.index}`,
  'generation.numberOf': (p: { index: number; max: number }) =>
    `Generation ${p.index} of ${p.max}`,

  'event.born': 'born',
  'event.baptised': 'baptised',
  'event.died': 'died',
  'event.buried': 'buried',
  'event.married': 'married',
  'lifespan.born': (p: { year: number }) => `b. ${p.year}`,
  'lifespan.died': (p: { year: number }) => `d. ${p.year}`,

  'stepper.older.aria': 'Previous (older) generation',
  'stepper.older.title': 'Older generation',
  'stepper.younger.aria': 'Next (younger) generation',
  'stepper.younger.title': 'Younger generation',
  'stepper.play.aria': 'Play through generations, oldest first',
  'stepper.play.title': 'Play from the oldest generation',
  'stepper.pause.aria': 'Pause animation',
  'stepper.pause.title': 'Pause',
  'stepper.range.aria': 'Generation (oldest on the left)',
  'stat.people': 'People',
  'stat.possible': 'Possible',
  'stat.onMap': 'On the map',
  'person.showAncestors': "Show this person's ancestors",
  'person.notOnMap': 'not on map',
  'person.notOnMap.title': 'Place not found on the map',

  'chart.title': 'People per generation',
  'chart.subtitle': (p: { name: string }) =>
    `Oldest generation on the left, leading up to ${p.name}`,
  'chart.showChart': 'Show chart',
  'chart.showTable': 'Show table',
  'chart.older': '← older generations',
  'chart.selected': 'selected person',
  'chart.tooltipCount': (p: { count: number; possible: number; pct: string }, n: NumberFormat) =>
    `${p.count} ${p.count === 1 ? 'person' : 'people'} of ${n(p.possible)} possible (${p.pct})`,
  'chart.collapse': (p: { repeats: number }) =>
    `${p.repeats} ancestor slot${p.repeats === 1 ? '' : 's'} filled by the same person (pedigree collapse)`,
  'chart.aria': (p: { depth: number; list: string }) =>
    `Column chart of people per generation, ${p.depth} generations back. ${p.list}`,
  'chart.ariaItem': (p: { index: number; count: number }) =>
    `Generation ${p.index}: ${p.count}`,
  'table.gen': 'Gen',
  'table.relation': 'Relation',
  'table.people': 'People',
  'table.possible': 'Possible',
  'table.complete': 'Complete',

  'map.zoomIn': 'Zoom in',
  'map.zoomOut': 'Zoom out',
  'map.fit.aria': 'Fit to ancestors',
  'map.fit.title': 'Fit',
  'map.more': (p: { count: number }) => `+${p.count} more`,
  'map.legendChildren': 'their children',
  'map.legendOthers': 'other ancestors',
  'map.showChildren': 'Show children',
  'map.order.aria': 'Animation order',
  'map.order.oldestFirst': 'Oldest → selected person',
  'map.order.rootFirst': 'Selected person → oldest',
  'map.saveGif': 'Save as GIF',
  'map.preparing': 'Preparing…',
  'map.rendering': (p: { frame: number; total: number }) => `Rendering ${p.frame}/${p.total}…`,
  'map.gifError': (p: { message: string }) => `Could not create the GIF: ${p.message}`,
  'map.lookingUp': 'Looking up places…',
  'map.noPlaces': 'No mappable places in this generation',
  'map.aria': (p: { label: string; list: string }) => `Map of ${p.label.toLowerCase()}: ${p.list}`,
  'map.dotAria': (p: { place: string; count: number }) =>
    `${p.place}: ${p.count} ${p.count === 1 ? 'person' : 'people'}`,
  'map.gifSubtitle': (p: { index: number; count: number; name: string }) =>
    `Generation ${p.index} · ${p.count} ${p.count === 1 ? 'person' : 'people'} · ancestors of ${p.name}`,
  'map.gifFile': 'ancestors',
  'mode.aria': 'Step through',
  'mode.generations': 'Generations',
  'mode.periods': (p: { years: number }) => `${p.years} years`,
  'mode.generations.title': 'Step through the generations of ancestors',
  'mode.periods.title': (p: { years: number }) =>
    `All births, baptisms, marriages, deaths and burials per ${p.years}-year period`,
  'period.label': (p: { start: number; end: number }) => `${p.start}–${p.end}`,
  'period.numberOf': (p: { position: number; total: number }) => `Period ${p.position} of ${p.total}`,
  'period.empty': 'No dated events are recorded for these ancestors.',
  'period.undated': (p: { count: number }) =>
    `${p.count} ${p.count === 1 ? 'ancestor' : 'ancestors'} without any dated event ${p.count === 1 ? 'is' : 'are'} not shown`,
  'stepper.periodOlder.aria': 'Previous (earlier) period',
  'stepper.periodOlder.title': 'Earlier period',
  'stepper.periodYounger.aria': 'Next (later) period',
  'stepper.periodYounger.title': 'Later period',
  'stepper.playPeriods.aria': 'Play through periods, oldest first',
  'stepper.playPeriods.title': 'Play from the oldest period',
  'stepper.periodRange.aria': 'Period (oldest on the left)',
  'stat.events': 'Events',
  'chart.periodTitle': (p: { years: number }) => `Events per ${p.years}-year period`,
  'chart.periodSubtitle': (p: { name: string }) =>
    `Births, baptisms, marriages, deaths and burials of ${p.name} and their ancestors`,
  'chart.periodOlder': '← earlier periods',
  'chart.periodNewer': 'most recent',
  'chart.periodCount': (p: { count: number }) => `${p.count} ${p.count === 1 ? 'event' : 'events'}`,
  'chart.periodAria': (p: { years: number; count: number; list: string }) =>
    `Column chart of events per ${p.years}-year period, ${p.count} periods. ${p.list}`,
  'table.period': 'Period',
  'table.born': 'Births',
  'table.baptised': 'Baptisms',
  'table.married': 'Marriages',
  'table.died': 'Deaths',
  'table.buried': 'Burials',
  'table.total': 'Total',
  'map.legendPeriod': (p: { label: string }) => `events ${p.label}`,
  'map.ariaPeriod': (p: { label: string; list: string }) => `Map of events ${p.label}: ${p.list}`,
  'map.dotAriaEvents': (p: { place: string; count: number }) =>
    `${p.place}: ${p.count} ${p.count === 1 ? 'event' : 'events'}`,
  'map.showParents': 'Lines to parents',
  'map.showParents.title': 'Connect each birth in this period to where the parents were born',
  'map.noPlacesPeriod': 'No mappable places in this period',
  'map.gifSubtitlePeriod': (p: { count: number; name: string }) =>
    `${p.count} ${p.count === 1 ? 'event' : 'events'} · ancestors of ${p.name}`,
} satisfies Record<string, Message>;

export type MessageKey = keyof typeof en;
type Messages = { [K in MessageKey]: (typeof en)[K] };

/** Dutch names for the generations, as used in Dutch genealogy (up to the "oud-" series). */
const DUTCH_GENERATIONS = [
  'Geselecteerde persoon',
  'Ouders',
  'Grootouders',
  'Overgrootouders',
  'Betovergrootouders',
  'Oudouders',
  'Oudgrootouders',
  'Oudovergrootouders',
  'Oudbetovergrootouders',
];

const nl: Messages = {
  'app.title': 'Hiero · GEDCOM-verkenner',
  'lang.aria': 'Taal',

  'theme.aria': 'Kleurthema',
  'theme.system': 'Systeem',
  'theme.light': 'Licht',
  'theme.dark': 'Donker',
  'theme.title': (p) => `Thema: ${p.label.toLowerCase()}`,

  'topbar.people': (p, n) => `${n(p.count)} ${p.count === 1 ? 'persoon' : 'personen'}`,
  'topbar.openAnother': 'Ander bestand openen',

  'welcome.title': 'Ontdek waar je voorouders vandaan kwamen',
  'welcome.lede':
    'Laad een GEDCOM-bestand, kies een persoon en ga generatie voor generatie terug door hun voorouders, op gedetailleerde kaarten van Nederland, België en Duitsland.',
  'upload.reading': 'Bestand wordt gelezen…',
  'upload.prompt': 'Sleep een GEDCOM-bestand hierheen, of klik om er een te kiezen',
  'upload.hint':
    '.ged-bestanden uit Gramps, MyHeritage, Ancestry, Aldfaer en andere. Het bestand blijft in je browser.',
  'upload.noFile': 'Geen bestand bij de hand?',
  'upload.sample': 'Probeer een fictieve voorbeeldstamboom',
  'error.sampleHttp': (p) => `Het voorbeeld kon niet worden geladen (HTTP ${p.status}).`,
  'error.noPeople': 'Geen personen (INDI-records) gevonden in dit bestand.',

  'root.eyebrow': 'Geselecteerde persoon',
  'root.depth': (p, n) =>
    `${p.depth === 1 ? 'generatie' : 'generaties'} voorouders vastgelegd · ${n(p.total)} voorouders in totaal`,
  'empty.hint':
    'Zoek links een persoon om hun voorouders per generatie en op de kaart te zien.',

  'search.label': 'Zoek een persoon',
  'search.placeholder': 'bijv. Jan Jansen, of Jansen 1850',
  'search.matches': (p, n) => `${n(p.total)} ${p.total === 1 ? 'resultaat' : 'resultaten'}`,
  'search.showingFirst': (p) => `de eerste ${p.count} worden getoond`,
  'search.depthTitle': (p) =>
    `${p.depth} ${p.depth === 1 ? 'generatie' : 'generaties'} voorouders vastgelegd`,
  'search.depthBadge': (p) => `${p.depth} gen.`,

  'generation.label': (p) => DUTCH_GENERATIONS[p.index] ?? `Voorouders, ${p.index}e generatie`,
  'generation.number': (p) => `Generatie ${p.index}`,
  'generation.numberOf': (p) => `Generatie ${p.index} van ${p.max}`,

  'event.born': 'geboren',
  'event.baptised': 'gedoopt',
  'event.died': 'overleden',
  'event.buried': 'begraven',
  'event.married': 'getrouwd',
  'lifespan.born': (p) => `geb. ${p.year}`,
  'lifespan.died': (p) => `ovl. ${p.year}`,

  'stepper.older.aria': 'Vorige (oudere) generatie',
  'stepper.older.title': 'Oudere generatie',
  'stepper.younger.aria': 'Volgende (jongere) generatie',
  'stepper.younger.title': 'Jongere generatie',
  'stepper.play.aria': 'Generaties afspelen, oudste eerst',
  'stepper.play.title': 'Afspelen vanaf de oudste generatie',
  'stepper.pause.aria': 'Animatie pauzeren',
  'stepper.pause.title': 'Pauzeren',
  'stepper.range.aria': 'Generatie (oudste links)',
  'stat.people': 'Personen',
  'stat.possible': 'Mogelijk',
  'stat.onMap': 'Op de kaart',
  'person.showAncestors': 'Toon de voorouders van deze persoon',
  'person.notOnMap': 'niet op kaart',
  'person.notOnMap.title': 'Plaats niet gevonden op de kaart',

  'chart.title': 'Personen per generatie',
  'chart.subtitle': (p) => `Oudste generatie links, oplopend naar ${p.name}`,
  'chart.showChart': 'Toon grafiek',
  'chart.showTable': 'Toon tabel',
  'chart.older': '← oudere generaties',
  'chart.selected': 'geselecteerde persoon',
  'chart.tooltipCount': (p, n) =>
    `${p.count} ${p.count === 1 ? 'persoon' : 'personen'} van ${n(p.possible)} mogelijk (${p.pct})`,
  'chart.collapse': (p) =>
    `${p.repeats} ${p.repeats === 1 ? 'voorouderplaats' : 'voorouderplaatsen'} ingenomen door dezelfde persoon (kwartierverlies)`,
  'chart.aria': (p) =>
    `Staafdiagram van personen per generatie, ${p.depth} generaties terug. ${p.list}`,
  'chart.ariaItem': (p) => `Generatie ${p.index}: ${p.count}`,
  'table.gen': 'Gen.',
  'table.relation': 'Relatie',
  'table.people': 'Personen',
  'table.possible': 'Mogelijk',
  'table.complete': 'Compleet',

  'map.zoomIn': 'Inzoomen',
  'map.zoomOut': 'Uitzoomen',
  'map.fit.aria': 'Passend maken op voorouders',
  'map.fit.title': 'Passend maken',
  'map.more': (p) => `+${p.count} meer`,
  'map.legendChildren': 'hun kinderen',
  'map.legendOthers': 'andere voorouders',
  'map.showChildren': 'Toon kinderen',
  'map.order.aria': 'Volgorde van de animatie',
  'map.order.oldestFirst': 'Oudste → geselecteerde persoon',
  'map.order.rootFirst': 'Geselecteerde persoon → oudste',
  'map.saveGif': 'Opslaan als GIF',
  'map.preparing': 'Voorbereiden…',
  'map.rendering': (p) => `Bezig met ${p.frame}/${p.total}…`,
  'map.gifError': (p) => `De GIF kon niet worden gemaakt: ${p.message}`,
  'map.lookingUp': 'Plaatsen opzoeken…',
  'map.noPlaces': 'Geen plaatsen op de kaart in deze generatie',
  'map.aria': (p) => `Kaart van ${p.label.toLowerCase()}: ${p.list}`,
  'map.dotAria': (p) => `${p.place}: ${p.count} ${p.count === 1 ? 'persoon' : 'personen'}`,
  'map.gifSubtitle': (p) =>
    `Generatie ${p.index} · ${p.count} ${p.count === 1 ? 'persoon' : 'personen'} · voorouders van ${p.name}`,
  'map.gifFile': 'voorouders',
  'mode.aria': 'Doorlopen per',
  'mode.generations': 'Generaties',
  'mode.periods': (p) => `${p.years} jaar`,
  'mode.generations.title': 'Doorloop de generaties voorouders',
  'mode.periods.title': (p) =>
    `Alle geboorten, dopen, huwelijken, overlijdens en begrafenissen per periode van ${p.years} jaar`,
  'period.label': (p) => `${p.start}–${p.end}`,
  'period.numberOf': (p) => `Periode ${p.position} van ${p.total}`,
  'period.empty': 'Voor deze voorouders zijn geen gedateerde gebeurtenissen vastgelegd.',
  'period.undated': (p) =>
    `${p.count} ${p.count === 1 ? 'voorouder' : 'voorouders'} zonder gedateerde gebeurtenis ${p.count === 1 ? 'wordt' : 'worden'} niet getoond`,
  'stepper.periodOlder.aria': 'Vorige (eerdere) periode',
  'stepper.periodOlder.title': 'Eerdere periode',
  'stepper.periodYounger.aria': 'Volgende (latere) periode',
  'stepper.periodYounger.title': 'Latere periode',
  'stepper.playPeriods.aria': 'Perioden afspelen, oudste eerst',
  'stepper.playPeriods.title': 'Afspelen vanaf de oudste periode',
  'stepper.periodRange.aria': 'Periode (oudste links)',
  'stat.events': 'Gebeurtenissen',
  'chart.periodTitle': (p) => `Gebeurtenissen per periode van ${p.years} jaar`,
  'chart.periodSubtitle': (p) =>
    `Geboorten, dopen, huwelijken, overlijdens en begrafenissen van ${p.name} en voorouders`,
  'chart.periodOlder': '← eerdere perioden',
  'chart.periodNewer': 'meest recent',
  'chart.periodCount': (p) => `${p.count} ${p.count === 1 ? 'gebeurtenis' : 'gebeurtenissen'}`,
  'chart.periodAria': (p) =>
    `Staafdiagram van gebeurtenissen per periode van ${p.years} jaar, ${p.count} perioden. ${p.list}`,
  'table.period': 'Periode',
  'table.born': 'Geboorten',
  'table.baptised': 'Dopen',
  'table.married': 'Huwelijken',
  'table.died': 'Overlijdens',
  'table.buried': 'Begrafenissen',
  'table.total': 'Totaal',
  'map.legendPeriod': (p) => `gebeurtenissen ${p.label}`,
  'map.ariaPeriod': (p) => `Kaart van gebeurtenissen ${p.label}: ${p.list}`,
  'map.dotAriaEvents': (p) =>
    `${p.place}: ${p.count} ${p.count === 1 ? 'gebeurtenis' : 'gebeurtenissen'}`,
  'map.showParents': 'Lijnen naar ouders',
  'map.showParents.title': 'Verbind elke geboorte in deze periode met de geboorteplaats van de ouders',
  'map.noPlacesPeriod': 'Geen plaatsen op de kaart in deze periode',
  'map.gifSubtitlePeriod': (p) =>
    `${p.count} ${p.count === 1 ? 'gebeurtenis' : 'gebeurtenissen'} · voorouders van ${p.name}`,
};

const MESSAGES: Record<Lang, Messages> = { en, nl };

/** Parameters a message takes: none for plain strings, the params object for functions. */
export type MessageArgs<K extends MessageKey> = (typeof en)[K] extends (p: infer P, ...rest: any[]) => string
  ? [params: P]
  : [];

const formatters = new Map<Lang, Intl.NumberFormat>();
export function formatNumber(lang: Lang, value: number, options?: Intl.NumberFormatOptions): string {
  if (options) return new Intl.NumberFormat(lang, options).format(value);
  let f = formatters.get(lang);
  if (!f) formatters.set(lang, (f = new Intl.NumberFormat(lang)));
  return f.format(value);
}

/** Looks up and fills in a message. Pure, so it also works outside Angular (tests, canvas). */
export function translate<K extends MessageKey>(lang: Lang, key: K, ...args: MessageArgs<K>): string {
  const message: Message = MESSAGES[lang][key] ?? en[key];
  if (typeof message === 'string') return message;
  return message(args[0], (v, o) => formatNumber(lang, v, o));
}

/** Picks the first supported language from the browser's preferences, falling back to English. */
export function detectLanguage(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    const match = LANGUAGES.find((l) => l.code === base);
    if (match) return match.code;
  }
  return 'en';
}

/** A translatable piece of text resolved later, e.g. an error stored before the language changes. */
export type LocalizedText = (lang: Lang) => string;
