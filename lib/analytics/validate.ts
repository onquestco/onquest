import type { PropertyRule } from './taxonomyFromCsv';
import { EVENTS, type EventName, type EventProps } from './taxonomy';

export type EventProperties = Record<string, string | number | boolean | undefined>;

/** What's wrong with an event's properties against its taxonomy rules ([] = valid). */
export function propertyProblems(rules: Record<string, PropertyRule>, properties: EventProperties): string[] {
  const problems: string[] = [];
  for (const [name, value] of Object.entries(properties)) {
    if (value === undefined) continue;
    const rule = rules[name];
    if (!rule) {
      problems.push(`${name}: not in the taxonomy`);
      continue;
    }
    if (rule.type === 'BOOL' && typeof value !== 'boolean') problems.push(`${name}: not a boolean`);
    if ((rule.type === 'INT64' || rule.type === 'FLOAT64') && typeof value !== 'number') {
      problems.push(`${name}: not a number`);
    }
    if (rule.type === 'INT64' && typeof value === 'number' && !Number.isInteger(value)) {
      problems.push(`${name}: not a whole number`);
    }
    if (typeof value === 'number' && rule.min !== undefined && rule.max !== undefined) {
      if (value < rule.min || value > rule.max)
        problems.push(`${name}: ${value} outside ${rule.min}–${rule.max}`);
    }
    if (rule.type === 'STRING' && typeof value !== 'string') problems.push(`${name}: not a string`);
    if (rule.values && !rule.values.includes(String(value))) problems.push(`${name}: "${value}" not allowed`);
    if (
      rule.list &&
      String(value)
        .split(',')
        .some((part) => !rule.list?.includes(part))
    ) {
      problems.push(`${name}: "${value}" not allowed`);
    }
  }
  for (const [name, rule] of Object.entries(rules)) {
    if (rule.required && properties[name] === undefined) problems.push(`${name}: missing`);
  }
  return problems;
}

/** Only the event's own properties survive (spec A §3.9 allowlist), never undefined ones. */
export function keepAllowed(
  rules: Record<string, PropertyRule>,
  properties: EventProperties,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, string | number | boolean] => entry[0] in rules && entry[1] !== undefined,
    ),
  );
}

// ---------------------------------------------------------------------------------------------
// v2 (docs/specs/analytics-v2.md §4.1, §4.2). Validation never drops an event: unknown properties
// and bad values are removed, a missing required property is only reported, and every problem
// names the property only, never its value (it could be user text).

export type PropertyValue = string | number | boolean | null;
export type Validated = { properties: Record<string, PropertyValue>; problems: string[] };

const PATTERNS: Record<NonNullable<PropertyRule['pattern']>, RegExp> = {
  key: /^[a-z0-9_-]{1,64}$/i,
  town: /^[\p{L}\p{M} .'-]{1,60}$/u,
  utm: /^[a-z0-9_.-]{1,40}$/,
};
const EMAIL_SHAPED = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** Why a value breaks its rule, or null when it's fine. */
function valueProblem(rule: PropertyRule, value: string | number | boolean): string | null {
  if (rule.type === 'BOOL') return typeof value === 'boolean' ? null : 'not a boolean';
  if (rule.type === 'TIMESTAMP') {
    const valid = typeof value === 'string' && ISO_WITH_OFFSET.test(value) && !Number.isNaN(Date.parse(value));
    return valid ? null : 'not an ISO timestamp with an offset';
  }
  if (rule.type === 'INT64' && !Number.isInteger(value)) return 'not a whole number';
  if (rule.type === 'FLOAT64' && !(typeof value === 'number' && Number.isFinite(value))) return 'not a number';
  if (rule.type === 'STRING' && typeof value !== 'string') return 'not a string';
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) return 'below the minimum';
    if (rule.max !== undefined && value > rule.max) return 'above the maximum';
  }
  if (rule.values && !rule.values.includes(value as string | number)) return 'not an allowed value';
  if (typeof value !== 'string') return null;
  if (rule.list && !value.split(',').every((part) => rule.list?.includes(part))) return 'not an allowed list';
  if (rule.pattern && !PATTERNS[rule.pattern].test(value)) return `not a valid ${rule.pattern}`;
  if (rule.type === 'STRING' && !rule.values && !rule.list && !rule.pattern) return 'free text is not allowed';
  return null;
}

/** utm_source is lowercased; anything that still isn't a plain tag is sent as "other" (spec §4.1). */
function normalise(rule: PropertyRule, value: string | number | boolean): string | number | boolean {
  if (rule.pattern !== 'utm' || typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  return PATTERNS.utm.test(lower) ? lower : 'other';
}

/** The properties that pass `rules`, and what was wrong (property names only). */
export function validateProperties(rules: Record<string, PropertyRule>, properties: object): Validated {
  const values: Record<string, unknown> = { ...properties };
  const kept: Record<string, PropertyValue> = {};
  const problems: string[] = [];
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const rule = rules[name];
    if (!rule) {
      problems.push(`${name}: not in the taxonomy`);
      continue;
    }
    if (value === null) {
      kept[name] = null;
      continue;
    }
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
      problems.push(`${name}: not a plain value`);
      continue;
    }
    // Checked before anything else, on every property: the one rule a pattern could miss.
    if (typeof value === 'string' && EMAIL_SHAPED.test(value)) {
      problems.push(`${name}: looks like an email`);
      continue;
    }
    const normalised = normalise(rule, value);
    const problem = valueProblem(rule, normalised);
    if (problem) problems.push(`${name}: ${problem}`);
    else kept[name] = normalised;
  }
  for (const [name, rule] of Object.entries(rules)) {
    if (rule.required && (values[name] === undefined || values[name] === null)) {
      problems.push(`${name}: missing`);
    }
  }
  return { properties: kept, problems };
}

/** An event's properties against the v2 taxonomy. An unknown name keeps no properties. */
export function validateEvent(event: string, properties: object): Validated {
  if (!Object.hasOwn(EVENTS, event)) {
    return { properties: {}, problems: ['event: not in the taxonomy'] };
  }
  return validateProperties(EVENTS[event as EventName].properties, properties);
}

/** Outside production builds (local dev and tests), property names only. */
export function warnProblems(event: string, problems: string[]): void {
  if (problems.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(`Analytics: ${event} sent with property problems`, problems);
  }
}

/** For property-builder unit tests: throws unless the builder's output is fully valid. */
export function expectNoProblems<Name extends EventName>(event: Name, properties: EventProps<Name> & object): void {
  const { problems } = validateEvent(event, properties);
  if (problems.length > 0) throw new Error(`${event}: ${problems.join('; ')}`);
}
