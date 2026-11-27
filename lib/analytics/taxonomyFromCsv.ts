// Turns the Taxonomy sheet's CSV export into the generated taxonomy modules. The CSVs win:
// `npm run analytics` regenerates the files, and a test fails if one is stale.
// docs/analytics/v2/{events,common}.csv → taxonomy.ts (docs/specs/analytics-v2.md §4.1). The v1
// taxonomy is frozen in taxonomyV1.ts and no longer generated (§3.5).

export type PropertyType = 'STRING' | 'BOOL' | 'INT64' | 'FLOAT64' | 'TIMESTAMP';
export type PropertyRule = {
  type: PropertyType;
  /** v2: drives types and dev warnings only. A missing property never drops an event. */
  required: boolean;
  /** One of these: "0 / 1 / 2" → [0, 1, 2] (INT64), "google / email_link" (STRING). */
  values?: readonly (string | number)[];
  /** A comma list of some of these, e.g. "name,photo" (STRING). */
  list?: readonly string[];
  /** Inclusive bounds (numbers). "2–" sets min only. */
  min?: number;
  max?: number;
  /** The only forms a free STRING may take (spec §4.1); see validate.ts. */
  pattern?: 'key' | 'town' | 'utm';
};
/** The frozen v1 shape (taxonomyV1.ts): event name → its property rules. */
export type Taxonomy = Record<string, Record<string, PropertyRule>>;

/** RFC 4180-ish: commas, quoted fields with "" escapes, \n or \r\n rows. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += char;
  }
  if (field || row.length) rows.push([...row, field]);
  return rows.filter((cells) => cells.some((cell) => cell.trim()));
}

// ---------------------------------------------------------------------------------------------
// v2 (docs/specs/analytics-v2.md §4.1).

export type EventType = 'click' | 'view' | 'client' | 'server';
/** Who the event is about, from the sheet's user_id column. */
export type EventUser = 'signed_in' | 'optional' | 'other_user';
export type EventRule = {
  type: EventType;
  user: EventUser;
  properties: Record<string, PropertyRule>;
};

type Override = { kind: 'permanent'; why: string } | { kind: 'temporary'; filledBy: `AN-${string}` };

/**
 * Properties that are optional although the sheet doesn't say so (spec §4.1). A bare name applies
 * to every event; `event.property` to one. A temporary entry is deleted by the task it names.
 */
export const OPTIONAL_OVERRIDES: Record<string, Override> = {
  referrer_quest_id: { kind: 'permanent', why: 'Only when a shared link brought the person in' },
  referrer_blog_id: { kind: 'permanent', why: 'Only when a shared link brought the person in' },
  referrer_owner_user_id: { kind: 'permanent', why: 'Only when a shared link brought the person in' },
  utm_source: { kind: 'permanent', why: 'Only when the link has one' },
  attempt: { kind: 'permanent', why: 'Only for error_type 1' },
  from_visibility: { kind: 'permanent', why: 'Unknown for blog history' },
  'blog_published.minutes_since_start': { kind: 'permanent', why: 'Old drafts have no startedAt' },
  'quest_viewed.source': { kind: 'permanent', why: 'Untagged in-app links' },
  'blog_viewed.source': { kind: 'permanent', why: 'Untagged in-app links' },
  'profile_viewed.source': { kind: 'permanent', why: 'Untagged in-app links' },
  'guide_viewed.source': { kind: 'permanent', why: 'Untagged in-app links' },
  first_seen_ts: { kind: 'permanent', why: 'Derived in BigQuery (events_clean), never sent' },
  days_since_last_sign_in: { kind: 'permanent', why: 'Derived in BigQuery (events_clean), never sent' },
  'create_option_click.from_screen': { kind: 'temporary', filledBy: 'AN-03' },
  'blog_viewed.read_time_min': { kind: 'temporary', filledBy: 'AN-13' },
  'content_liked.owner_user_id': { kind: 'temporary', filledBy: 'AN-09' },
  'comment_posted.owner_user_id': { kind: 'temporary', filledBy: 'AN-09' },
  'comment_posted.is_owner_flg': { kind: 'temporary', filledBy: 'AN-09' },
  'comments_toggled.comment_count': { kind: 'temporary', filledBy: 'AN-09' },
  'visibility_changed.days_since_publish': { kind: 'temporary', filledBy: 'AN-09' },
  'content_deleted.like_count': { kind: 'temporary', filledBy: 'AN-09' },
  'content_deleted.comment_count': { kind: 'temporary', filledBy: 'AN-09' },
  'content_deleted.age_days': { kind: 'temporary', filledBy: 'AN-09' },
  'content_deleted.photo_count': { kind: 'temporary', filledBy: 'AN-09' },
  'blog_published.is_first_blog_flg': { kind: 'temporary', filledBy: 'AN-09' },
  'blog_updated.days_since_post': { kind: 'temporary', filledBy: 'AN-09' },
  'blog_editor_action.photo_count': { kind: 'temporary', filledBy: 'AN-13' },
  'blog_editor_action.blocked_flg': { kind: 'temporary', filledBy: 'AN-13' },
};

const QUEST_EDIT_ACTIONS = Array.from({ length: 12 }, (_, code) => String(code));
const PROFILE_FIELDS = ['name', 'username', 'photo', 'city', 'bio'];

/**
 * The only free STRINGs allowed besides keys (`*_id`), so no user text can reach analytics
 * (spec §4.1, AC10). Any other STRING without allowed values fails the generator.
 */
const FREE_STRING_FORMS: Record<string, Pick<PropertyRule, 'pattern' | 'list'>> = {
  chip_name: { pattern: 'town' },
  utm_source: { pattern: 'utm' },
  change_types: { list: QUEST_EDIT_ACTIONS },
  fields_changed: { list: PROFILE_FIELDS },
};

const EVENT_TYPES: readonly string[] = ['click', 'view', 'client', 'server'];
const PROPERTY_TYPES: readonly string[] = ['STRING', 'BOOL', 'INT64', 'FLOAT64', 'TIMESTAMP'];
const EVENT_USERS: Record<string, EventUser> = {
  user_id: 'signed_in',
  'user_id (empty when signed out)': 'optional',
  'user_id (person notified)': 'other_user',
};
/**
 * Wording that says a property can be absent (spec §4.1): "null", "if any", "reserved", or a
 * limit like "Quests tab only:" / "only when …". A bare "only" ("count only") doesn't count.
 */
const SAYS_OPTIONAL = /\b(null|if any|reserved)\b|\bonly\s*:|\bonly (when|for|if|on)\b/i;
/** A code meaning such as "3 = Place (reserved)", up to the next "/" or ";". */
const CODE_MEANING = /(^|\/)\s*\d+\s*=[^/;]*/g;

/** One CSV row of an event (its first row or one of the property rows under it). */
export type EventCsvRow = {
  event: string;
  status: string;
  type: string;
  user: string;
  property: string;
  dataType: string;
  allowed: string;
  description: string;
};

/** Rows with their event filled in. Section rows are skipped; columns are found by header. */
export function readEventRows(text: string): EventCsvRow[] {
  const [header = [], ...rows] = parseCsv(text);
  const column = (name: string) => {
    const index = header.findIndex((cell) => cell.trim() === name);
    if (index < 0) throw new Error(`events.csv has no "${name}" column`);
    return index;
  };
  const at = {
    event: column('name'),
    status: column('Status'),
    type: column('type'),
    user: column('user_id'),
    property: column('properties [JSON key]'),
    dataType: column('Data type'),
    allowed: column('Allowed values'),
    description: column('Property description'),
  };
  const result: EventCsvRow[] = [];
  let current: Pick<EventCsvRow, 'event' | 'status' | 'type' | 'user'> | undefined;
  for (const cells of rows) {
    const cell = (index: number) => cells[index]?.trim() ?? '';
    if (cell(at.event)) {
      current = { event: cell(at.event), status: cell(at.status), type: cell(at.type), user: cell(at.user) };
    } else if (!cell(at.property)) {
      current = undefined; // a section row ("3. Create a Quest")
      continue;
    }
    if (!current) continue;
    result.push({
      ...current,
      property: cell(at.property),
      dataType: cell(at.dataType),
      allowed: cell(at.allowed),
      description: cell(at.description),
    });
  }
  return result;
}

/** Only the sentence-level wording counts, not the code meanings: "0 = Feed (reserved)" is a code. */
function isRequired(row: EventCsvRow): boolean {
  const wording = row.description.replace(CODE_MEANING, ' ');
  if (SAYS_OPTIONAL.test(wording) || SAYS_OPTIONAL.test(row.allowed)) return false;
  return !OPTIONAL_OVERRIDES[row.property] && !OPTIONAL_OVERRIDES[`${row.event}.${row.property}`];
}

function ruleV2(row: EventCsvRow): PropertyRule {
  const where = `${row.event}.${row.property}`;
  if (!PROPERTY_TYPES.includes(row.dataType)) throw new Error(`${where}: unknown data type "${row.dataType}"`);
  const base: PropertyRule = { type: row.dataType as PropertyType, required: isRequired(row) };
  const text = row.allowed;
  if (base.type === 'BOOL' || base.type === 'TIMESTAMP') return base;
  if (base.type === 'STRING') {
    if (text.includes(' / ')) return { ...base, values: text.split(' / ').map((value) => value.trim()) };
    const key: Pick<PropertyRule, 'pattern'> | null = row.property.endsWith('_id') ? { pattern: 'key' } : null;
    const form = FREE_STRING_FORMS[row.property] ?? key;
    if (!form) throw new Error(`${where}: a free STRING must be a key, town, utm or code list (spec §4.1)`);
    const sheetFields = text.split(',').map((field) => field.trim());
    if (row.property === 'fields_changed' && sheetFields.join() !== PROFILE_FIELDS.join()) {
      throw new Error(`${where}: the sheet's fields no longer match PROFILE_FIELDS`);
    }
    return { ...base, ...form };
  }
  if (!text) return base;
  const range = /^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)?$/.exec(text);
  if (range) return { ...base, min: Number(range[1]), ...(range[2] ? { max: Number(range[2]) } : {}) };
  const values = text.split(' / ').map((value) => value.trim());
  if (values.every((value) => /^\d+$/.test(value))) return { ...base, values: values.map(Number) };
  throw new Error(`${where}: can't read allowed values "${text}"`);
}

/** events.csv → every event's type, user and property rules. */
export function taxonomyV2FromCsv(text: string): Record<string, EventRule> {
  const events: Record<string, EventRule> = {};
  for (const row of readEventRows(text)) {
    if (!EVENT_TYPES.includes(row.type)) throw new Error(`${row.event}: unknown type "${row.type}"`);
    const user = EVENT_USERS[row.user];
    if (!user) throw new Error(`${row.event}: unknown user_id "${row.user}"`);
    const event = (events[row.event] ??= { type: row.type as EventType, user, properties: {} });
    if (row.property.startsWith('(')) continue; // "(common props only)"
    if (event.properties[row.property]) throw new Error(`${row.event}.${row.property}: listed twice`);
    event.properties[row.property] = ruleV2(row);
  }
  return events;
}

/** Common properties spec §4.2 adds that common.csv has no row for (set by the senders). */
const SENDER_SET_COMMON = ['env', 'type'];

/**
 * common.csv → the top-level common property names ($pageview and user_info.* sub-keys left
 * out), plus SENDER_SET_COMMON, so /ingest's allowlist (AN-03) never strips env or type.
 */
export function commonPropertiesFromCsv(text: string): string[] {
  const [header = [], ...rows] = parseCsv(text);
  const nameAt = header.findIndex((cell) => cell.trim() === 'properties [JSON key]');
  const typeAt = header.findIndex((cell) => cell.trim() === 'Data type');
  if (nameAt < 0 || typeAt < 0) throw new Error('common.csv has no property or data type column');
  return rows
    .filter((cells) => cells[typeAt]?.trim() !== 'event' && !cells[nameAt]?.includes('.'))
    .map((cells) => cells[nameAt]?.trim() ?? '')
    .filter(Boolean)
    .concat(SENDER_SET_COMMON.filter((name) => !rows.some((cells) => cells[nameAt]?.trim() === name)))
    .sort();
}

type RuleValue<Rule> = Rule extends { values: readonly (infer Value)[] }
  ? Value
  : Rule extends { type: 'BOOL' }
    ? boolean
    : Rule extends { type: 'INT64' | 'FLOAT64' }
      ? number
      : string;
type RequiredNames<Rules> = {
  [Name in keyof Rules]: Rules[Name] extends { required: true } ? Name : never;
}[keyof Rules];

/** The properties a caller passes for these rules: required ones required, the rest optional. */
export type RuleProps<Rules extends Record<string, PropertyRule>> = {
  [Name in RequiredNames<Rules>]: RuleValue<Rules[Name]>;
} & {
  [Name in Exclude<keyof Rules, RequiredNames<Rules>>]?: RuleValue<Rules[Name]> | null;
};

/** The generated taxonomy.ts. Events sorted by name, properties in sheet order. */
export function renderTaxonomyV2Module(events: Record<string, EventRule>, common: string[]): string {
  const sorted = Object.fromEntries(
    Object.keys(events)
      .sort()
      .map((name) => [name, events[name]]),
  );
  return [
    '// Generated by `npm run analytics` from docs/analytics/v2/{events,common}.csv. Do not edit:',
    '// change the sheet, export it, and run the script again (docs/specs/analytics-v2.md §4.1).',
    "import type { EventRule, EventType, RuleProps } from './taxonomyFromCsv';",
    '',
    `export const EVENTS = ${JSON.stringify(sorted, null, 2)} as const satisfies Record<string, EventRule>;`,
    '',
    '/** Set on every event by the senders (common.csv), never passed by callers. */',
    `export const COMMON_PROPERTIES = ${JSON.stringify(common)} as const;`,
    '',
    'export type EventName = keyof typeof EVENTS;',
    'type NamesOfType<Type extends EventType> = {',
    "  [Name in EventName]: (typeof EVENTS)[Name]['type'] extends Type ? Name : never;",
    '}[EventName];',
    "export type BrowserEventName = NamesOfType<'click' | 'view' | 'client'>;",
    "export type ServerEventName = NamesOfType<'server'>;",
    "export type EventProps<Name extends EventName> = RuleProps<(typeof EVENTS)[Name]['properties']>;",
    '',
  ].join('\n');
}
